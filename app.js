/* ==========================================================================
   Spool — vanilla JS client for the full-backend API
   No frameworks, no build step. Everything below is plain fetch() calls
   against /api/v1, a tiny hash router, and template-string rendering.
   ========================================================================== */

/* ---------------------------------------------------------------------
   DOM + formatting helpers
   --------------------------------------------------------------------- */

   const qs = (sel, ctx = document) => ctx.querySelector(sel);
   const qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
   
   function esc(str) {
     return String(str ?? '').replace(/[&<>"']/g, (c) => ({
       '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
     }[c]));
   }
   
   // Some backend aggregations forget to flatten a $lookup result, leaving
   // e.g. `owner` as a one-item array instead of an object. Normalize defensively.
   function firstOf(x) {
     if (Array.isArray(x)) return x[0] ?? null;
     return x ?? null;
   }
   
   function formatDuration(seconds) {
     const s = Math.max(0, Math.round(Number(seconds) || 0));
     if (!s) return '—:—';
     const h = Math.floor(s / 3600);
     const m = Math.floor((s % 3600) / 60);
     const sec = s % 60;
     const pad = (n) => String(n).padStart(2, '0');
     return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
   }
   
   function compactNumber(n) {
     n = Number(n) || 0;
     if (n < 1000) return String(n);
     return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
   }
   
   function formatDate(iso) {
     if (!iso) return '';
     const d = new Date(iso);
     if (Number.isNaN(d.getTime())) return '';
     return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
   }
   
   const PLACEHOLDER_AVATAR = 'data:image/svg+xml;utf8,' + encodeURIComponent(
     '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#1b2136"/></svg>'
   );
   const PLACEHOLDER_THUMB = 'data:image/svg+xml;utf8,' + encodeURIComponent(
     '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#1b2136"/>' +
     '<text x="160" y="94" fill="#666d92" font-family="monospace" font-size="14" text-anchor="middle">no thumbnail</text></svg>'
   );
   
   function setBusy(form, busy) {
     const btn = form.querySelector('button[type="submit"]');
     if (!btn) return;
     if (busy) {
       btn.dataset.label = btn.textContent;
       btn.textContent = 'Working…';
       btn.disabled = true;
     } else {
       if (btn.dataset.label) btn.textContent = btn.dataset.label;
       btn.disabled = false;
     }
   }
   
   /* ---------------------------------------------------------------------
      Toasts
      --------------------------------------------------------------------- */
   
   function toast(message, type = 'info', ms = 4200) {
     const stack = qs('#toastStack');
     const div = document.createElement('div');
     div.className = `toast${type === 'success' ? ' toast-success' : type === 'error' ? ' toast-error' : ''}`;
     div.textContent = message;
     stack.appendChild(div);
     setTimeout(() => div.remove(), ms);
   }
   
   /* ---------------------------------------------------------------------
      Modal
      --------------------------------------------------------------------- */
   
   function openModal(html) {
     qs('#modalBody').innerHTML = html;
     qs('#modalOverlay').hidden = false;
   }
   function closeModal() {
     qs('#modalOverlay').hidden = true;
     qs('#modalBody').innerHTML = '';
   }
   function confirmDialog(message, confirmLabel = 'Delete') {
     return new Promise((resolve) => {
       openModal(`
         <p style="margin-top:0;">${esc(message)}</p>
         <div class="form-actions">
           <button class="btn btn-danger" id="confirmYes" type="button">${esc(confirmLabel)}</button>
           <button class="btn btn-ghost" id="confirmNo" type="button">Cancel</button>
         </div>`);
       qs('#confirmYes').addEventListener('click', () => { closeModal(); resolve(true); });
       qs('#confirmNo').addEventListener('click', () => { closeModal(); resolve(false); });
     });
   }
   
   /* ---------------------------------------------------------------------
      Backend connection settings (API base URL)
      --------------------------------------------------------------------- */
   
   const STORAGE = {
     base: 'spool.apiBase',
     access: 'spool.accessToken',
     refresh: 'spool.refreshToken',
   };
   const DEFAULT_API_BASE =
   import.meta.env.VITE_API_BASE ||
   'http://localhost:8000/api/v1';
   
   function getApiBase() { return localStorage.getItem(STORAGE.base) || DEFAULT_API_BASE; }
   function setApiBase(v) { localStorage.setItem(STORAGE.base, v.replace(/\/+$/, '')); }
   
   /* ---------------------------------------------------------------------
      API client
      --------------------------------------------------------------------- */
   
   class ApiError extends Error {
     constructor(message, status, payload) {
       super(message);
       this.status = status;
       this.payload = payload;
     }
   }
   
   async function parseBody(res) {
     const text = await res.text();
     if (!text) return null;
     try { return JSON.parse(text); } catch { return { message: text.slice(0, 300) }; }
   }
   
   function qsString(params = {}) {
     const usp = new URLSearchParams();
     Object.entries(params).forEach(([k, v]) => {
       if (v === undefined || v === null || v === '') return;
       usp.set(k, v);
     });
     const s = usp.toString();
     return s ? `?${s}` : '';
   }
   
   async function tryRefreshToken() {
     const rt = localStorage.getItem(STORAGE.refresh);
     if (!rt) return false;
     try {
       const res = await apiRequest('/users/refresh-token', { method: 'POST', json: { refreshToken: rt }, auth: false });
       const data = res?.data;
       if (data?.accessToken) {
         localStorage.setItem(STORAGE.access, data.accessToken);
         if (data.refreshToken) localStorage.setItem(STORAGE.refresh, data.refreshToken);
         return true;
       }
       return false;
     } catch {
       return false;
     }
   }
   
   async function apiRequest(path, opts = {}) {
     const { method = 'GET', json, form, auth = true, isRetry = false } = opts;
     const base = getApiBase();
     const headers = {};
     let body;
     if (form) {
       body = form;
     } else if (json !== undefined) {
       headers['Content-Type'] = 'application/json';
       body = JSON.stringify(json);
     }
     if (auth) {
       const token = localStorage.getItem(STORAGE.access);
       if (token) headers.Authorization = `Bearer ${token}`;
     }
   
     let res;
     try {
       res = await fetch(base + path, { method, headers, body });
     } catch {
       throw new ApiError(
         `Can't reach ${base}. Make sure the backend is running and that CORS_ORIGIN in its .env allows this page's origin (${location.origin}).`,
         0, null
       );
     }
   
     if (res.status === 401 && auth && !isRetry && path !== '/users/refresh-token' && path !== '/users/login') {
       const refreshed = await tryRefreshToken();
       if (refreshed) return apiRequest(path, { ...opts, isRetry: true });
       clearSession();
       throw new ApiError('Your session expired. Please log in again.', 401, null);
     }
   
     const payload = await parseBody(res);
     if (!res.ok) {
       const message = payload?.message || payload?.error?.message || res.statusText || `Request failed (${res.status})`;
       throw new ApiError(message, res.status, payload);
     }
     return payload;
   }
   
   const api = {
     // users
     register: (fd) => apiRequest('/users/register', { method: 'POST', form: fd, auth: false }),
     login: (payload) => apiRequest('/users/login', { method: 'POST', json: payload, auth: false }),
     logout: () => apiRequest('/users/logout', { method: 'POST' }),
     me: () => apiRequest('/users/current-user'),
     updateAccount: (payload) => apiRequest('/users/update-account', { method: 'PATCH', json: payload }),
     changePassword: (payload) => apiRequest('/users/change-password', { method: 'POST', json: payload }),
     updateAvatar: (fd) => apiRequest('/users/avatar', { method: 'PATCH', form: fd }),
     updateCoverImage: (fd) => apiRequest('/users/cover-image', { method: 'PATCH', form: fd }),
     channel: (username) => apiRequest(`/users/channel/${encodeURIComponent(username)}`),
     history: () => apiRequest('/users/history'),
   
     // videos
     listVideos: (params) => apiRequest(`/videos${qsString(params)}`),
     getVideo: (id) => apiRequest(`/videos/${id}`),
     publishVideo: (fd) => apiRequest('/videos', { method: 'POST', form: fd }),
     updateVideo: (id, fd) => apiRequest(`/videos/${id}`, { method: 'PATCH', form: fd }),
     deleteVideo: (id) => apiRequest(`/videos/${id}`, { method: 'DELETE' }),
     togglePublish: (id) => apiRequest(`/videos/toggle/publish/${id}`, { method: 'PATCH' }),
   
     // comments
     listComments: (videoId, params) => apiRequest(`/comments/${videoId}${qsString(params)}`),
     addComment: (videoId, content) => apiRequest(`/comments/${videoId}`, { method: 'POST', json: { content } }),
     updateComment: (id, content) => apiRequest(`/comments/c/${id}`, { method: 'PATCH', json: { content } }),
     deleteComment: (id) => apiRequest(`/comments/c/${id}`, { method: 'DELETE' }),
   
     // likes
     toggleVideoLike: (id) => apiRequest(`/likes/toggle/v/${id}`, { method: 'POST' }),
     toggleCommentLike: (id) => apiRequest(`/likes/toggle/c/${id}`, { method: 'POST' }),
     likedVideos: () => apiRequest('/likes/videos'),
   
     // subscriptions
     toggleSubscription: (channelId) => apiRequest(`/subscriptions/c/${channelId}`, { method: 'POST' }),
     channelSubscribers: (channelId) => apiRequest(`/subscriptions/c/${channelId}`),
     subscribedChannels: (subscriberId) => apiRequest(`/subscriptions/u/${subscriberId}`),
   
     // playlists
     createPlaylist: (payload) => apiRequest('/playlist', { method: 'POST', json: payload }),
     userPlaylists: (userId) => apiRequest(`/playlist/user/${userId}`),
     getPlaylist: (id) => apiRequest(`/playlist/${id}`),
     updatePlaylist: (id, payload) => apiRequest(`/playlist/${id}`, { method: 'PATCH', json: payload }),
     deletePlaylist: (id) => apiRequest(`/playlist/${id}`, { method: 'DELETE' }),
     addVideoToPlaylist: (videoId, playlistId) => apiRequest(`/playlist/add/${videoId}/${playlistId}`, { method: 'PATCH' }),
     removeVideoFromPlaylist: (videoId, playlistId) => apiRequest(`/playlist/remove/${videoId}/${playlistId}`, { method: 'PATCH' }),
   
     // dashboard
     dashboardStats: () => apiRequest('/dashboard/stats'),
     dashboardVideos: () => apiRequest('/dashboard/videos'),
   };
   
   /* ---------------------------------------------------------------------
      App state + session
      --------------------------------------------------------------------- */
   
   const state = {
     user: null,
     likedVideoIds: new Set(),
     browse: { page: 1, limit: 12, query: '', sortBy: 'createdAt', sortType: 'desc' },
     comments: { videoId: null, page: 1, limit: 20, hasNextPage: false },
   };
   
   let currentPlaylistId = null;
   let currentChannel = null;
   
   function applySession({ user, accessToken, refreshToken }) {
     localStorage.setItem(STORAGE.access, accessToken);
     localStorage.setItem(STORAGE.refresh, refreshToken);
     state.user = user;
     renderAuthUI();
     primeLikedVideos();
   }
   
   function clearSession() {
     localStorage.removeItem(STORAGE.access);
     localStorage.removeItem(STORAGE.refresh);
     state.user = null;
     state.likedVideoIds = new Set();
     renderAuthUI();
   }
   
   async function primeLikedVideos() {
     try {
       const res = await api.likedVideos();
       const ids = (res.data || []).map((item) => item?.likedVideo?._id).filter(Boolean);
       state.likedVideoIds = new Set(ids);
     } catch {
       /* best effort — not critical to app function */
     }
   }
   
   function renderAuthUI() {
     document.body.classList.toggle('authed', !!state.user);
     const area = qs('#authArea');
     if (!state.user) {
       area.innerHTML = `
         <div class="auth-actions">
           <button class="btn btn-ghost btn-sm" type="button" data-authtab="login">Log in</button>
           <button class="btn btn-primary btn-sm" type="button" data-authtab="register">Sign up</button>
         </div>`;
       qsa('[data-authtab]', area).forEach((btn) => btn.addEventListener('click', () => {
         location.hash = '#/auth';
         switchAuthTab(btn.dataset.authtab);
       }));
       return;
     }
     area.innerHTML = `
       <div class="user-menu" id="userMenu">
         <button class="user-chip" type="button" id="userChipBtn">
           <img src="${esc(state.user.avatar || PLACEHOLDER_AVATAR)}" alt="" />
           <span>${esc(state.user.fullName)}</span>
         </button>
         <div class="user-dropdown">
           <a href="#/channel/${esc(state.user.userName)}">My channel</a>
           <a href="#/account">Account settings</a>
           <button type="button" id="logoutBtn" class="danger-item">Log out</button>
         </div>
       </div>`;
     qs('#userChipBtn').addEventListener('click', () => qs('#userMenu').classList.toggle('open'));
     qs('#logoutBtn').addEventListener('click', doLogout);
   }
   
   function switchAuthTab(tab) {
     qsa('#authTabs .tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
     qs('#loginForm').hidden = tab !== 'login';
     qs('#registerForm').hidden = tab !== 'register';
   }
   
   async function doLogout() {
     try { await api.logout(); } catch { /* best effort */ }
     clearSession();
     toast('Logged out', 'success');
     location.hash = '#/auth';
     renderRoute();
   }
   
   /* ---------------------------------------------------------------------
      Router
      --------------------------------------------------------------------- */
   
   const PROTECTED = new Set([
     'browse', 'video', 'upload', 'edit-video', 'channel', 'dashboard',
     'playlists', 'playlist', 'history', 'liked', 'subscriptions', 'account',
   ]);
   
   function parseHash() {
     const raw = location.hash.replace(/^#\/?/, '');
     const parts = raw.split('/').filter(Boolean);
     return { name: parts[0] || 'browse', params: parts.slice(1) };
   }
   
   function showView(id) {
     qsa('.view').forEach((v) => { v.hidden = true; });
     const target = qs(`#view-${id}`);
     if (target) target.hidden = false;
   }
   
   function setActiveNav(name) {
     qsa('#mainNav a').forEach((a) => a.classList.toggle('active', a.dataset.nav === name));
   }
   
   async function renderRoute() {
     const { name, params } = parseHash();
   
     if (PROTECTED.has(name) && !state.user) {
       showView('auth');
       switchAuthTab('login');
       setActiveNav(null);
       window.scrollTo(0, 0);
       return;
     }
     if (name === 'auth' && state.user) {
       location.hash = '#/browse';
       return;
     }
   
     try {
       switch (name) {
         case 'auth':
           showView('auth');
           break;
         case 'browse':
           showView('browse');
           await renderBrowse();
           break;
         case 'video':
           showView('video');
           await renderVideoDetail(params[0]);
           break;
         case 'upload':
           showView('video-form');
           prepareVideoForm(null);
           break;
         case 'edit-video':
           showView('video-form');
           await prepareVideoForm(params[0]);
           break;
         case 'channel':
           showView('channel');
           await renderChannel(params[0]);
           break;
         case 'dashboard':
           showView('dashboard');
           await renderDashboard();
           break;
         case 'playlists':
           showView('playlists');
           await renderPlaylists();
           break;
         case 'playlist':
           showView('playlist');
           await renderPlaylistDetail(params[0]);
           break;
         case 'history':
           showView('history');
           await renderHistory();
           break;
         case 'liked':
           showView('liked');
           await renderLiked();
           break;
         case 'subscriptions':
           showView('subscriptions');
           await renderSubscriptions();
           break;
         case 'account':
           showView('account');
           renderAccount();
           break;
         default:
           showView('browse');
           await renderBrowse();
       }
     } catch (err) {
       toast(err.message, 'error');
     }
   
     setActiveNav(name);
     window.scrollTo(0, 0);
   }
   
   window.addEventListener('hashchange', renderRoute);
   
   /* ---------------------------------------------------------------------
      Shared templates
      --------------------------------------------------------------------- */
   
   function videoCardHtml(v) {
     const owner = firstOf(v.owner) || {};
     const chip = `<span class="counter-chip">${esc(formatDuration(v.duration))}</span>`;
     const badge = v.isPublished === false ? '<span class="unpublished-badge">Draft</span>' : '';
     return `
       <a class="video-card" href="#/video/${v._id}">
         <div class="video-thumb-wrap">
           <img src="${esc(v.thumbnail || PLACEHOLDER_THUMB)}" alt="" loading="lazy" />
           <div class="video-thumb-chip">${chip}</div>
         </div>
         <div class="video-card-body">
           <p class="video-card-title">${esc(v.title)}</p>
           <div class="video-card-owner">
             <img src="${esc(owner.avatar || PLACEHOLDER_AVATAR)}" alt="" />
             <span>${esc(owner.fullName || owner.userName || 'Unknown creator')}</span>
           </div>
           <div class="video-card-meta">
             <span>${compactNumber(v.views)} views</span>
             <span>&middot;</span>
             <span>${esc(formatDate(v.createdAt))}</span>
             ${badge}
           </div>
         </div>
       </a>`;
   }
   
   function emptyStateHtml(title, body) {
     return `<div class="state-block"><p class="display-sm">${esc(title)}</p><p>${esc(body)}</p></div>`;
   }
   function errorStateHtml(message) {
     return `<div class="state-block state-error"><p class="display-sm">Something went wrong</p><p>${esc(message)}</p></div>`;
   }
   function skeletonGrid(n = 8) {
     return Array.from({ length: n }).map(() => `
       <div class="skeleton-card">
         <div class="skeleton-thumb"></div>
         <div class="skeleton-line" style="width:80%"></div>
         <div class="skeleton-line" style="width:50%"></div>
       </div>`).join('');
   }
   function renderGrid(container, items, emptyTitle, emptyBody) {
     container.innerHTML = items.length
       ? items.map(videoCardHtml).join('')
       : emptyStateHtml(emptyTitle, emptyBody);
   }
   
   function playlistCardHtml(p) {
     const count = Array.isArray(p.videos) ? p.videos.length : 0;
     return `
       <a class="playlist-card" href="#/playlist/${p._id}">
         <p class="display-sm">${esc(p.name)}</p>
         <p>${esc(p.description || '')}</p>
         <span class="counter-chip">${count} video${count === 1 ? '' : 's'}</span>
       </a>`;
   }
   
   /* ---------------------------------------------------------------------
      Browse
      --------------------------------------------------------------------- */
   
   async function renderBrowse() {
     const grid = qs('#videoGrid');
     qs('#browseSearchInput').value = state.browse.query;
     qs('#browseSortSelect').value = `${state.browse.sortBy}:${state.browse.sortType}`;
     grid.innerHTML = skeletonGrid();
     try {
       const res = await api.listVideos({
         page: state.browse.page,
         limit: state.browse.limit,
         query: state.browse.query || undefined,
         sortBy: state.browse.sortBy,
         sortType: state.browse.sortType,
       });
       const data = res.data || {};
       const docs = data.docs || [];
       renderGrid(grid, docs, 'No videos found',
         state.browse.query ? 'Try a different search.' : 'Nothing has been published yet — be the first.');
       qs('#pagerInfo').textContent = `page ${data.page || 1} / ${data.totalPages || 1}`;
       qs('#prevPageBtn').disabled = !data.hasPrevPage;
       qs('#nextPageBtn').disabled = !data.hasNextPage;
     } catch (err) {
       grid.innerHTML = errorStateHtml(err.message);
     }
   }
   
   /* ---------------------------------------------------------------------
      Video detail
      --------------------------------------------------------------------- */
   
   async function renderVideoDetail(id) {
     if (!id) { location.hash = '#/browse'; return; }
   
     const player = qs('#videoPlayer');
     player.removeAttribute('src');
     qs('#videoTitle').textContent = 'Loading…';
     qs('#videoDescription').textContent = '';
     qs('#videoOwnerCard').innerHTML = '';
     qs('#videoActions').innerHTML = '';
     qs('#videoStats').innerHTML = '';
     qs('#commentList').innerHTML = '';
     qs('#loadMoreCommentsBtn').hidden = true;
   
     let video;
     try {
       const res = await api.getVideo(id);
       video = res.data;
     } catch (err) {
       qs('#videoTitle').textContent = 'Video unavailable';
       qs('#videoDescription').textContent = err.message;
       return;
     }
   
     const owner = firstOf(video.owner);
   
     player.src = video.videoFile;
     qs('#videoTitle').textContent = video.title;
     qs('#videoDescription').textContent = video.description;
   
     qs('#videoStats').innerHTML = `
       <span class="counter-chip">${compactNumber(video.views)} views</span>
       <span class="counter-chip">${esc(formatDuration(video.duration))}</span>
       <span class="counter-chip">${esc(formatDate(video.createdAt))}</span>
       ${video.isPublished === false ? '<span class="unpublished-badge">Draft — only you can see this</span>' : ''}
     `;
   
     const isOwner = !!(state.user && owner && state.user._id === owner._id);
     const isLiked = state.likedVideoIds.has(video._id);
   
     const actions = [];
     actions.push(`<button class="btn ${isLiked ? 'btn-teal' : 'btn-ghost'} btn-sm" id="likeBtn" type="button">${isLiked ? '♥ Liked' : '♡ Like'}</button>`);
     if (isOwner) {
       actions.push(`<a class="btn btn-ghost btn-sm" href="#/edit-video/${video._id}">Edit</a>`);
       actions.push(`<button class="btn btn-ghost btn-sm" id="togglePublishBtn" type="button">${video.isPublished === false ? 'Publish' : 'Unpublish'}</button>`);
       actions.push('<button class="btn btn-danger btn-sm" id="deleteVideoBtn" type="button">Delete</button>');
     } else if (state.user) {
       actions.push('<button class="btn btn-ghost btn-sm" id="addToPlaylistBtn" type="button">+ Save to playlist</button>');
     }
     qs('#videoActions').innerHTML = actions.join('');
   
     qs('#likeBtn').addEventListener('click', () => toggleVideoLikeHandler(video._id));
     if (isOwner) {
       qs('#togglePublishBtn').addEventListener('click', () => togglePublishHandler(video._id));
       qs('#deleteVideoBtn').addEventListener('click', () => deleteVideoHandler(video._id));
     } else if (state.user) {
       qs('#addToPlaylistBtn').addEventListener('click', () => openAddToPlaylistModal(video._id));
     }
   
     renderOwnerCard(owner, isOwner);
   
     state.comments = { videoId: video._id, page: 1, limit: 20, hasNextPage: false };
     qs('#commentForm').reset();
     await loadComments(true);
   }
   
   async function renderOwnerCard(owner, isOwner) {
     const card = qs('#videoOwnerCard');
     if (!owner) { card.innerHTML = ''; return; }
     card.innerHTML = `
       <a href="#/channel/${esc(owner.userName)}"><img src="${esc(owner.avatar || PLACEHOLDER_AVATAR)}" alt="" /></a>
       <div class="owner-info">
         <a href="#/channel/${esc(owner.userName)}" class="owner-name">${esc(owner.fullName)}</a>
         <div class="owner-handle">@${esc(owner.userName)} &middot; <span id="ownerSubCount">…</span> subscribers</div>
       </div>
       <div id="ownerSubscribeSlot"></div>`;
     if (isOwner || !state.user) return;
     try {
       const res = await api.channel(owner.userName);
       const channel = res.data;
       qs('#ownerSubCount').textContent = compactNumber(channel.subscribersCount || 0);
       const slot = qs('#ownerSubscribeSlot');
       slot.innerHTML = `<button class="btn btn-sm ${channel.isSubscribed ? 'btn-ghost' : 'btn-teal'}" id="subscribeBtn" type="button">${channel.isSubscribed ? 'Following' : '+ Follow'}</button>`;
       qs('#subscribeBtn').addEventListener('click', async () => {
         try {
           const res2 = await api.toggleSubscription(channel._id);
           toast(res2.message, 'success');
           renderOwnerCard(owner, isOwner);
         } catch (err) { toast(err.message, 'error'); }
       });
     } catch {
       qs('#ownerSubCount').textContent = '0';
     }
   }
   
   async function toggleVideoLikeHandler(videoId) {
     try {
       const res = await api.toggleVideoLike(videoId);
       const liked = !!res.data?.isLiked;
       if (liked) state.likedVideoIds.add(videoId); else state.likedVideoIds.delete(videoId);
       const btn = qs('#likeBtn');
       btn.className = `btn ${liked ? 'btn-teal' : 'btn-ghost'} btn-sm`;
       btn.textContent = liked ? '♥ Liked' : '♡ Like';
       toast(res.message, 'success');
     } catch (err) { toast(err.message, 'error'); }
   }
   
   async function togglePublishHandler(videoId) {
     try {
       const res = await api.togglePublish(videoId);
       toast(res.message, 'success');
       renderVideoDetail(videoId);
     } catch (err) { toast(err.message, 'error'); }
   }
   
   async function deleteVideoHandler(videoId) {
     const ok = await confirmDialog('Delete this video? This cannot be undone.');
     if (!ok) return;
     try {
       await api.deleteVideo(videoId);
       toast('Video deleted', 'success');
       location.hash = '#/dashboard';
       renderRoute();
     } catch (err) { toast(err.message, 'error'); }
   }
   
   /* ---------------------------------------------------------------------
      Comments
      --------------------------------------------------------------------- */
   
   function commentRowHtml(c) {
     const owner = firstOf(c.owner) || {};
     const isOwn = !!(state.user && owner._id === state.user._id);
     return `
       <div class="comment-row" data-comment-id="${c._id}">
         <img src="${esc(owner.avatar || PLACEHOLDER_AVATAR)}" alt="" />
         <div class="comment-body">
           <div class="comment-head">
             <span class="comment-author">${esc(owner.fullName || owner.userName || 'Someone')}</span>
             <span class="comment-date">${esc(formatDate(c.createdAt))}</span>
           </div>
           <p class="comment-text">${esc(c.content)}</p>
           <div class="comment-controls">
             <button data-action="like-comment" data-id="${c._id}" type="button">Like</button>
             ${isOwn ? `<button data-action="edit-comment" data-id="${c._id}" type="button">Edit</button>
             <button data-action="delete-comment" data-id="${c._id}" type="button">Delete</button>` : ''}
           </div>
         </div>
       </div>`;
   }
   
   async function loadComments(reset) {
     const list = qs('#commentList');
     if (reset) list.innerHTML = '<p class="text-faint">Loading comments…</p>';
     try {
       const res = await api.listComments(state.comments.videoId, { page: state.comments.page, limit: state.comments.limit });
       const data = res.data || {};
       const docs = data.docs || [];
       if (reset) list.innerHTML = '';
       if (!docs.length && reset) {
         list.innerHTML = '<p class="text-faint">No comments yet — say something.</p>';
       } else {
         list.insertAdjacentHTML('beforeend', docs.map(commentRowHtml).join(''));
       }
       state.comments.hasNextPage = !!data.hasNextPage;
       qs('#loadMoreCommentsBtn').hidden = !data.hasNextPage;
     } catch (err) {
       if (reset) list.innerHTML = errorStateHtml(err.message);
     }
   }
   
   /* ---------------------------------------------------------------------
      Add-to-playlist modal
      --------------------------------------------------------------------- */
   
   async function openAddToPlaylistModal(videoId) {
     openModal('<p>Loading your playlists…</p>');
     try {
       const res = await api.userPlaylists(state.user._id);
       const playlists = res.data || [];
       const rows = playlists.length
         ? playlists.map((p) => `
           <div class="modal-playlist-row">
             <span>${esc(p.name)}</span>
             <button class="btn btn-primary btn-sm" data-playlist-id="${p._id}" type="button">Add</button>
           </div>`).join('')
         : '<p class="text-faint">You have no playlists yet.</p>';
       openModal(`
         <h2 class="display-sm">Save to playlist</h2>
         ${rows}
         <form id="quickCreatePlaylistForm" class="inline-form" style="margin-top:16px;">
           <input type="text" name="name" placeholder="New playlist name" required />
           <input type="text" name="description" placeholder="Description" required />
           <button class="btn btn-ghost btn-sm" type="submit">Create &amp; add</button>
         </form>`);
       qsa('[data-playlist-id]').forEach((btn) => btn.addEventListener('click', async () => {
         try {
           await api.addVideoToPlaylist(videoId, btn.dataset.playlistId);
           toast('Added to playlist', 'success');
           closeModal();
         } catch (err) { toast(err.message, 'error'); }
       }));
       qs('#quickCreatePlaylistForm').addEventListener('submit', async (e) => {
         e.preventDefault();
         const form = e.target;
         try {
           const res2 = await api.createPlaylist({ name: form.name.value.trim(), description: form.description.value.trim() });
           await api.addVideoToPlaylist(videoId, res2.data._id);
           toast('Playlist created and video added', 'success');
           closeModal();
         } catch (err) { toast(err.message, 'error'); }
       });
     } catch (err) {
       openModal(`<p>${esc(err.message)}</p>`);
     }
   }
   
   /* ---------------------------------------------------------------------
      Publish / edit video
      --------------------------------------------------------------------- */
   
   async function prepareVideoForm(id) {
     const form = qs('#videoForm');
     form.reset();
     const isEdit = !!id;
     qs('#videoFormTitle').textContent = isEdit ? 'Edit video' : 'Publish a video';
     qs('#videoFormSubmitBtn').textContent = isEdit ? 'Save changes' : 'Publish';
   
     const videoFileField = qs('#videoFileInput').closest('.field');
     videoFileField.hidden = isEdit;
     qs('#videoFileInput').disabled = isEdit;
     qs('#thumbnailField').querySelector('span').textContent = isEdit ? 'New thumbnail (optional)' : 'Thumbnail';
   
     form.dataset.mode = isEdit ? 'edit' : 'create';
     form.dataset.videoId = id || '';
   
     if (isEdit) {
       try {
         const res = await api.getVideo(id);
         const video = res.data;
         const owner = firstOf(video.owner);
         if (!state.user || !owner || owner._id !== state.user._id) {
           toast('You can only edit your own videos', 'error');
           location.hash = '#/dashboard';
           return;
         }
         form.title.value = video.title;
         form.description.value = video.description;
       } catch (err) {
         toast(err.message, 'error');
         location.hash = '#/dashboard';
       }
     }
   }
   
   /* ---------------------------------------------------------------------
      Channel
      --------------------------------------------------------------------- */
   
   async function renderChannel(username) {
     if (!username) { location.hash = '#/browse'; return; }
     currentChannel = null;
     qs('#channelBanner').style.backgroundImage = '';
     qs('#channelHeader').innerHTML = '<p class="text-faint">Loading…</p>';
     qs('#channelVideoGrid').innerHTML = skeletonGrid(4);
     qs('#channelPlaylistGrid').innerHTML = '';
     qs('#channelVideoGrid').hidden = false;
     qs('#channelPlaylistGrid').hidden = true;
     qsa('#channelTabs .tab').forEach((b) => b.classList.toggle('active', b.dataset.ctab === 'videos'));
   
     let channel;
     try {
       const res = await api.channel(username);
       channel = res.data;
     } catch (err) {
       qs('#channelHeader').innerHTML = errorStateHtml(err.message);
       return;
     }
     currentChannel = channel;
   
     if (channel.coverImage) qs('#channelBanner').style.backgroundImage = `url('${channel.coverImage}')`;
   
     const isSelf = !!(state.user && state.user._id === channel._id);
     qs('#channelHeader').innerHTML = `
       <img class="channel-avatar" src="${esc(channel.avatar || PLACEHOLDER_AVATAR)}" alt="" />
       <div class="channel-info">
         <div class="channel-name">${esc(channel.fullName)}</div>
         <div class="channel-handle">@${esc(channel.userName)}</div>
         <div class="channel-stats">${compactNumber(channel.subscribersCount || 0)} subscribers &middot; following ${compactNumber(channel.channelsSubscribedTo || 0)}</div>
       </div>
       <div id="channelSubscribeSlot"></div>`;
   
     if (isSelf) {
       qs('#channelSubscribeSlot').innerHTML = '<a class="btn btn-ghost btn-sm" href="#/account">Edit profile</a>';
     } else {
       qs('#channelSubscribeSlot').innerHTML = `<button class="btn btn-sm ${channel.isSubscribed ? 'btn-ghost' : 'btn-teal'}" id="channelSubBtn" type="button">${channel.isSubscribed ? 'Following' : '+ Follow'}</button>`;
       qs('#channelSubBtn').addEventListener('click', async () => {
         try {
           const res = await api.toggleSubscription(channel._id);
           toast(res.message, 'success');
           renderChannel(username);
         } catch (err) { toast(err.message, 'error'); }
       });
     }
   
     await loadChannelVideos(channel._id);
   }
   
   async function loadChannelVideos(channelId) {
     const grid = qs('#channelVideoGrid');
     grid.innerHTML = skeletonGrid(4);
     try {
       const res = await api.listVideos({ userId: channelId, limit: 24, sortBy: 'createdAt', sortType: 'desc' });
       renderGrid(grid, res.data?.docs || [], 'No videos yet', 'This channel hasn\u2019t published anything yet.');
     } catch (err) { grid.innerHTML = errorStateHtml(err.message); }
   }
   
   async function loadChannelPlaylists(userId) {
     const grid = qs('#channelPlaylistGrid');
     grid.innerHTML = skeletonGrid(3);
     try {
       const res = await api.userPlaylists(userId);
       const playlists = res.data || [];
       grid.innerHTML = playlists.length
         ? playlists.map(playlistCardHtml).join('')
         : emptyStateHtml('No playlists', 'This channel hasn\u2019t made any playlists yet.');
     } catch (err) { grid.innerHTML = errorStateHtml(err.message); }
   }
   
   /* ---------------------------------------------------------------------
      Dashboard
      --------------------------------------------------------------------- */
   
   async function renderDashboard() {
     const statGrid = qs('#statGrid');
     const list = qs('#dashboardVideoList');
     statGrid.innerHTML = '';
     list.innerHTML = '<p class="text-faint">Loading…</p>';
     try {
       const [statsRes, videosRes] = await Promise.all([api.dashboardStats(), api.dashboardVideos()]);
       const stats = statsRes.data || {};
       const cards = [
         ['Videos', stats.totalVideos],
         ['Views', stats.totalViews],
         ['Subscribers', stats.totalSubscribers],
         ['Likes', stats.totalLikes],
         ['Comments', stats.totalComments],
       ];
       statGrid.innerHTML = cards.map(([label, value]) => `
         <div class="stat-card">
           <span class="stat-value">${compactNumber(value || 0)}</span>
           <span class="stat-label">${esc(label)}</span>
         </div>`).join('');
   
       const videos = videosRes.data || [];
       if (!videos.length) {
         list.innerHTML = emptyStateHtml('No videos yet', 'Publish your first video to see it here.');
         return;
       }
       list.innerHTML = videos.map((v) => `
         <div class="list-row" data-video-id="${v._id}">
           <img class="row-thumb" src="${esc(v.thumbnail || PLACEHOLDER_THUMB)}" alt="" />
           <div class="row-main">
             <div class="row-title">${esc(v.title)} ${v.isPublished === false ? '<span class="unpublished-badge">Draft</span>' : ''}</div>
             <div class="row-meta">
               <span class="mono">${compactNumber(v.views)} views</span>
               <span class="mono">${esc(formatDuration(v.duration))}</span>
               <span>${esc(formatDate(v.createdAt))}</span>
             </div>
           </div>
           <div class="row-actions">
             <a class="btn btn-ghost btn-sm" href="#/video/${v._id}">View</a>
             <a class="btn btn-ghost btn-sm" href="#/edit-video/${v._id}">Edit</a>
             <button class="btn btn-ghost btn-sm" data-action="toggle" data-id="${v._id}" type="button">${v.isPublished === false ? 'Publish' : 'Unpublish'}</button>
             <button class="btn btn-danger btn-sm" data-action="delete" data-id="${v._id}" type="button">Delete</button>
           </div>
         </div>`).join('');
     } catch (err) {
       list.innerHTML = errorStateHtml(err.message);
     }
   }
   
   /* ---------------------------------------------------------------------
      Playlists
      --------------------------------------------------------------------- */
   
   async function renderPlaylists() {
     const grid = qs('#playlistGrid');
     grid.innerHTML = skeletonGrid(4);
     try {
       const res = await api.userPlaylists(state.user._id);
       const playlists = res.data || [];
       grid.innerHTML = playlists.length
         ? playlists.map(playlistCardHtml).join('')
         : emptyStateHtml('No playlists yet', 'Create your first playlist below.');
     } catch (err) { grid.innerHTML = errorStateHtml(err.message); }
   }
   
   async function renderPlaylistDetail(id) {
     if (!id) { location.hash = '#/playlists'; return; }
     currentPlaylistId = id;
     const header = qs('#playlistHeader');
     const grid = qs('#playlistVideoGrid');
     header.innerHTML = '<p class="text-faint">Loading…</p>';
     grid.innerHTML = '';
   
     let playlist;
     try {
       const res = await api.getPlaylist(id);
       playlist = res.data;
     } catch (err) {
       header.innerHTML = errorStateHtml(err.message);
       return;
     }
   
     const owner = firstOf(playlist.owner);
     const isOwner = !!(state.user && owner && state.user._id === owner._id);
   
     header.innerHTML = `
       <h1 class="display-lg" style="margin-bottom:4px;">${esc(playlist.name)}</h1>
       <p class="text-dim">${esc(playlist.description || '')}</p>
       <p class="text-faint">by ${esc(owner?.fullName || owner?.userName || 'Unknown')} &middot; ${(playlist.videos || []).length} videos</p>
       ${isOwner ? `
         <div class="form-actions">
           <button class="btn btn-ghost btn-sm" id="editPlaylistBtn" type="button">Edit details</button>
           <button class="btn btn-danger btn-sm" id="deletePlaylistBtn" type="button">Delete playlist</button>
         </div>` : ''}`;
   
     if (isOwner) {
       qs('#editPlaylistBtn').addEventListener('click', () => openEditPlaylistModal(playlist));
       qs('#deletePlaylistBtn').addEventListener('click', async () => {
         const ok = await confirmDialog('Delete this playlist? This cannot be undone.');
         if (!ok) return;
         try {
           await api.deletePlaylist(id);
           toast('Playlist deleted', 'success');
           location.hash = '#/playlists';
           renderRoute();
         } catch (err) { toast(err.message, 'error'); }
       });
     }
   
     const videos = playlist.videos || [];
     if (!videos.length) {
       grid.innerHTML = emptyStateHtml('No videos yet', 'Add videos to this playlist from any video page.');
       return;
     }
     grid.innerHTML = videos.map((v) => `
       <div style="position:relative;">
         ${videoCardHtml(v)}
         ${isOwner ? `<button class="btn btn-danger btn-sm" data-action="remove" data-id="${v._id}" style="position:absolute;top:8px;right:8px;">Remove</button>` : ''}
       </div>`).join('');
   }
   
   function openEditPlaylistModal(playlist) {
     openModal(`
       <h2 class="display-sm">Edit playlist</h2>
       <form id="editPlaylistForm" class="stack-form">
         <label class="field"><span>Name</span><input type="text" name="name" value="${esc(playlist.name)}" required /></label>
         <label class="field"><span>Description</span><textarea name="description" required rows="3">${esc(playlist.description || '')}</textarea></label>
         <button class="btn btn-primary btn-sm" type="submit">Save</button>
       </form>`);
     qs('#editPlaylistForm').addEventListener('submit', async (e) => {
       e.preventDefault();
       const form = e.target;
       try {
         await api.updatePlaylist(playlist._id, { name: form.name.value.trim(), description: form.description.value.trim() });
         toast('Playlist updated', 'success');
         closeModal();
         renderPlaylistDetail(playlist._id);
       } catch (err) { toast(err.message, 'error'); }
     });
   }
   
   /* ---------------------------------------------------------------------
      History / Liked
      --------------------------------------------------------------------- */
   
   async function renderHistory() {
     const grid = qs('#historyGrid');
     grid.innerHTML = skeletonGrid();
     try {
       const res = await api.history();
       renderGrid(grid, res.data || [], 'No watch history yet', 'Videos you watch will show up here.');
     } catch (err) { grid.innerHTML = errorStateHtml(err.message); }
   }
   
   async function renderLiked() {
     const grid = qs('#likedGrid');
     grid.innerHTML = skeletonGrid();
     try {
       const res = await api.likedVideos();
       const items = res.data || [];
       state.likedVideoIds = new Set(items.map((i) => i?.likedVideo?._id).filter(Boolean));
       const videos = items.map((i) => i.likedVideo).filter(Boolean);
       renderGrid(grid, videos, 'No liked videos yet', 'Videos you like will show up here.');
     } catch (err) { grid.innerHTML = errorStateHtml(err.message); }
   }
   
   /* ---------------------------------------------------------------------
      Subscriptions
      --------------------------------------------------------------------- */
   
   function subscriptionRowHtml(person, showUnfollow) {
     return `
       <div class="list-row" data-id="${person._id}">
         <img class="row-avatar" src="${esc(person.avatar || PLACEHOLDER_AVATAR)}" alt="" />
         <div class="row-main">
           <a class="row-title" href="#/channel/${esc(person.userName)}">${esc(person.fullName)}</a>
           <div class="row-meta">@${esc(person.userName)}</div>
         </div>
         ${showUnfollow ? `<div class="row-actions"><button class="btn btn-ghost btn-sm" data-action="unfollow" data-id="${person._id}" type="button">Unfollow</button></div>` : ''}
       </div>`;
   }
   
   async function renderSubscriptions() {
     const followingList = qs('#followingList');
     const subscribersList = qs('#subscribersList');
     followingList.innerHTML = '<p class="text-faint">Loading…</p>';
     subscribersList.innerHTML = '<p class="text-faint">Loading…</p>';
     try {
       const res = await api.subscribedChannels(state.user._id);
       const channels = (res.data || []).map((x) => firstOf(x.channel)).filter(Boolean);
       followingList.innerHTML = channels.length
         ? channels.map((c) => subscriptionRowHtml(c, true)).join('')
         : emptyStateHtml('Not following anyone yet', 'Channels you follow will show up here.');
     } catch (err) { followingList.innerHTML = errorStateHtml(err.message); }
     try {
       const res = await api.channelSubscribers(state.user._id);
       const subs = (res.data || []).map((x) => firstOf(x.subscriber)).filter(Boolean);
       subscribersList.innerHTML = subs.length
         ? subs.map((c) => subscriptionRowHtml(c, false)).join('')
         : emptyStateHtml('No subscribers yet', 'People who follow you will show up here.');
     } catch (err) { subscribersList.innerHTML = errorStateHtml(err.message); }
   }
   
   /* ---------------------------------------------------------------------
      Account settings
      --------------------------------------------------------------------- */
   
   function renderAccount() {
     const u = state.user;
     if (!u) return;
     qs('#accountDetailsForm').fullName.value = u.fullName || '';
     qs('#accountDetailsForm').email.value = u.email || '';
     qs('#avatarPreview').src = u.avatar || PLACEHOLDER_AVATAR;
     qs('#coverPreview').src = u.coverImage || PLACEHOLDER_THUMB;
   }
   
   /* =======================================================================
      Static event wiring — bound once, elements exist for the app's lifetime
      ======================================================================= */
   
   // -- auth --
   qsa('#authTabs .tab').forEach((tab) => tab.addEventListener('click', () => switchAuthTab(tab.dataset.tab)));
   
   qs('#loginForm').addEventListener('submit', async (e) => {
     e.preventDefault();
     const form = e.target;
     const identifier = form.identifier.value.trim();
     const payload = { password: form.password.value };
     if (identifier.includes('@')) payload.email = identifier; else payload.userName = identifier;
     try {
       setBusy(form, true);
       const res = await api.login(payload);
       applySession(res.data);
       toast(res.message || 'Welcome back', 'success');
       form.reset();
       location.hash = '#/browse';
       renderRoute();
     } catch (err) { toast(err.message, 'error'); }
     finally { setBusy(form, false); }
   });
   
   qs('#registerForm').addEventListener('submit', async (e) => {
     e.preventDefault();
     const form = e.target;
     const fd = new FormData(form);
     const avatarFile = fd.get('avatar');
     if (!(avatarFile instanceof File) || avatarFile.size === 0) {
       toast('Please choose an avatar image', 'error');
       return;
     }
     try {
       setBusy(form, true);
       await api.register(fd);
       toast('Account created — log in to continue', 'success');
       form.reset();
       switchAuthTab('login');
     } catch (err) { toast(err.message, 'error'); }
     finally { setBusy(form, false); }
   });
   
   // -- browse --
   let searchDebounce;
   qs('#browseSearchInput').addEventListener('input', (e) => {
     clearTimeout(searchDebounce);
     searchDebounce = setTimeout(() => {
       state.browse.query = e.target.value.trim();
       state.browse.page = 1;
       renderBrowse();
     }, 400);
   });
   qs('#browseSortSelect').addEventListener('change', (e) => {
     const [sortBy, sortType] = e.target.value.split(':');
     state.browse.sortBy = sortBy;
     state.browse.sortType = sortType;
     state.browse.page = 1;
     renderBrowse();
   });
   qs('#prevPageBtn').addEventListener('click', () => { if (state.browse.page > 1) { state.browse.page -= 1; renderBrowse(); } });
   qs('#nextPageBtn').addEventListener('click', () => { state.browse.page += 1; renderBrowse(); });
   
   qs('#quickSearchForm').addEventListener('submit', (e) => {
     e.preventDefault();
     state.browse.query = qs('#quickSearchInput').value.trim();
     state.browse.page = 1;
     location.hash = '#/browse';
     renderBrowse();
   });
   
   // -- video detail: comments --
   qs('#commentForm').addEventListener('submit', async (e) => {
     e.preventDefault();
     const form = e.target;
     const content = form.content.value.trim();
     if (!content) return;
     try {
       setBusy(form, true);
       await api.addComment(state.comments.videoId, content);
       form.reset();
       state.comments.page = 1;
       await loadComments(true);
     } catch (err) { toast(err.message, 'error'); }
     finally { setBusy(form, false); }
   });
   
   qs('#loadMoreCommentsBtn').addEventListener('click', () => {
     state.comments.page += 1;
     loadComments(false);
   });
   
   qs('#commentList').addEventListener('click', async (e) => {
     const btn = e.target.closest('button[data-action]');
     if (!btn) return;
     const { action, id } = btn.dataset;
   
     if (action === 'like-comment') {
       try {
         const res = await api.toggleCommentLike(id);
         const liked = !!res.data?.isLiked;
         btn.classList.toggle('liked', liked);
         btn.textContent = liked ? 'Liked' : 'Like';
       } catch (err) { toast(err.message, 'error'); }
     }
   
     if (action === 'delete-comment') {
       const ok = await confirmDialog('Delete this comment?');
       if (!ok) return;
       try {
         await api.deleteComment(id);
         state.comments.page = 1;
         await loadComments(true);
         toast('Comment deleted', 'success');
       } catch (err) { toast(err.message, 'error'); }
     }
   
     if (action === 'edit-comment') {
       const row = btn.closest('.comment-row');
       const textEl = row.querySelector('.comment-text');
       const controls = btn.closest('.comment-controls');
       const current = textEl.textContent;
       controls.style.display = 'none';
       controls.insertAdjacentHTML('beforebegin', `
         <form class="comment-edit-form" style="display:flex;gap:8px;margin:4px 0;">
           <textarea style="flex:1;background:var(--bg-inset);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px;">${esc(current)}</textarea>
           <button class="btn btn-primary btn-sm" type="submit">Save</button>
         </form>`);
       const editForm = row.querySelector('.comment-edit-form');
       editForm.addEventListener('submit', async (ev) => {
         ev.preventDefault();
         const newContent = editForm.querySelector('textarea').value.trim();
         if (!newContent) return;
         try {
           await api.updateComment(id, newContent);
           textEl.textContent = newContent;
           editForm.remove();
           controls.style.display = '';
           toast('Comment updated', 'success');
         } catch (err) { toast(err.message, 'error'); }
       });
     }
   });
   
   // -- publish / edit video form --
   qs('#videoForm').addEventListener('submit', async (e) => {
     e.preventDefault();
     const form = e.target;
     const mode = form.dataset.mode;
     const fd = new FormData();
     fd.append('title', form.title.value.trim());
     fd.append('description', form.description.value.trim());
     const videoFile = qs('#videoFileInput').files[0];
     const thumbnail = qs('#thumbnailInput').files[0];
   
     if (mode === 'create') {
       if (!videoFile || !thumbnail) {
         toast('A video file and a thumbnail are both required', 'error');
         return;
       }
       fd.append('videoFile', videoFile);
       fd.append('thumbnail', thumbnail);
     } else if (thumbnail) {
       fd.append('thumbnail', thumbnail);
     }
   
     try {
       setBusy(form, true);
       if (mode === 'edit') {
         await api.updateVideo(form.dataset.videoId, fd);
         toast('Video updated', 'success');
         location.hash = `#/video/${form.dataset.videoId}`;
       } else {
         const res = await api.publishVideo(fd);
         toast('Video published', 'success');
         location.hash = `#/video/${res.data._id}`;
       }
       renderRoute();
     } catch (err) { toast(err.message, 'error'); }
     finally { setBusy(form, false); }
   });
   
   // -- channel tabs --
   qs('#channelTabs').addEventListener('click', (e) => {
     const btn = e.target.closest('.tab');
     if (!btn || !currentChannel) return;
     const tab = btn.dataset.ctab;
     qsa('#channelTabs .tab').forEach((b) => b.classList.toggle('active', b === btn));
     qs('#channelVideoGrid').hidden = tab !== 'videos';
     qs('#channelPlaylistGrid').hidden = tab !== 'playlists';
     if (tab === 'playlists') loadChannelPlaylists(currentChannel._id);
   });
   
   // -- dashboard video actions --
   qs('#dashboardVideoList').addEventListener('click', async (e) => {
     const btn = e.target.closest('button[data-action]');
     if (!btn) return;
     const { action, id } = btn.dataset;
     if (action === 'toggle') {
       try { await api.togglePublish(id); renderDashboard(); } catch (err) { toast(err.message, 'error'); }
     }
     if (action === 'delete') {
       const ok = await confirmDialog('Delete this video? This cannot be undone.');
       if (!ok) return;
       try {
         await api.deleteVideo(id);
         toast('Video deleted', 'success');
         renderDashboard();
       } catch (err) { toast(err.message, 'error'); }
     }
   });
   
   // -- playlists --
   qs('#createPlaylistForm').addEventListener('submit', async (e) => {
     e.preventDefault();
     const form = e.target;
     try {
       setBusy(form, true);
       await api.createPlaylist({ name: form.name.value.trim(), description: form.description.value.trim() });
       form.reset();
       toast('Playlist created', 'success');
       renderPlaylists();
     } catch (err) { toast(err.message, 'error'); }
     finally { setBusy(form, false); }
   });
   
   qs('#playlistVideoGrid').addEventListener('click', async (e) => {
     const btn = e.target.closest('button[data-action="remove"]');
     if (!btn || !currentPlaylistId) return;
     e.preventDefault();
     try {
       await api.removeVideoFromPlaylist(btn.dataset.id, currentPlaylistId);
       toast('Removed from playlist', 'success');
       renderPlaylistDetail(currentPlaylistId);
     } catch (err) { toast(err.message, 'error'); }
   });
   
   // -- subscriptions --
   qs('#followingList').addEventListener('click', async (e) => {
     const btn = e.target.closest('button[data-action="unfollow"]');
     if (!btn) return;
     try {
       await api.toggleSubscription(btn.dataset.id);
       toast('Unfollowed', 'success');
       renderSubscriptions();
     } catch (err) { toast(err.message, 'error'); }
   });
   
   // -- account settings --
   qs('#accountDetailsForm').addEventListener('submit', async (e) => {
     e.preventDefault();
     const form = e.target;
     try {
       setBusy(form, true);
       const res = await api.updateAccount({ fullName: form.fullName.value.trim(), email: form.email.value.trim() });
       state.user = { ...state.user, ...res.data };
       renderAuthUI();
       toast('Details saved', 'success');
     } catch (err) { toast(err.message, 'error'); }
     finally { setBusy(form, false); }
   });
   
   qs('#passwordForm').addEventListener('submit', async (e) => {
     e.preventDefault();
     const form = e.target;
     if (form.newPassword.value !== form.confirmPassword.value) {
       toast('New passwords do not match', 'error');
       return;
     }
     try {
       setBusy(form, true);
       await api.changePassword({ oldPassword: form.oldPassword.value, newPassword: form.newPassword.value });
       form.reset();
       toast('Password updated', 'success');
     } catch (err) { toast(err.message, 'error'); }
     finally { setBusy(form, false); }
   });
   
   qs('#avatarForm').addEventListener('submit', async (e) => {
     e.preventDefault();
     const form = e.target;
     const file = form.avatar.files[0];
     if (!file) return;
     const fd = new FormData();
     fd.append('avatar', file);
     try {
       setBusy(form, true);
       const res = await api.updateAvatar(fd);
       const updated = res.data?.user || res.data;
       state.user = { ...state.user, ...updated };
       renderAuthUI();
       renderAccount();
       toast('Avatar updated', 'success');
     } catch (err) { toast(err.message, 'error'); }
     finally { setBusy(form, false); }
   });
   
   qs('#coverForm').addEventListener('submit', async (e) => {
     e.preventDefault();
     const form = e.target;
     const file = form.coverImage.files[0];
     if (!file) return;
     const fd = new FormData();
     fd.append('coverImage', file);
     try {
       setBusy(form, true);
       const res = await api.updateCoverImage(fd);
       const updated = res.data?.user || res.data;
       state.user = { ...state.user, ...updated };
       renderAccount();
       toast('Cover image updated', 'success');
     } catch (err) { toast(err.message, 'error'); }
     finally { setBusy(form, false); }
   });
   
   // -- back buttons --
   qsa('[data-back]').forEach((b) => b.addEventListener('click', () => {
     const view = b.closest('.view').id.replace('view-', '');
     const fallback = { video: 'browse', playlist: 'playlists' };
     location.hash = '#/' + (fallback[view] || 'browse');
   }));
   
   // -- user menu + modal chrome --
   document.addEventListener('click', (e) => {
     const menu = qs('#userMenu');
     if (menu && !menu.contains(e.target)) menu.classList.remove('open');
   });
   qs('#modalCloseBtn').addEventListener('click', closeModal);
   qs('#modalOverlay').addEventListener('click', (e) => { if (e.target.id === 'modalOverlay') closeModal(); });
   document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !qs('#modalOverlay').hidden) closeModal(); });
   
   // -- backend connection settings --
   qs('#settingsBtn').addEventListener('click', () => {
     openModal(`
       <h2 class="display-sm">Backend connection</h2>
       <p class="text-dim" style="font-size:0.85rem;">
         Point this page at your running <code>full-backend</code> server. It listens on <code>PORT</code>
         from your <code>.env</code> (4000 by default), and every route lives under <code>/api/v1</code>.
       </p>
       <form id="apiBaseForm" class="stack-form">
         <label class="field"><span>API base URL</span><input type="text" name="base" value="${esc(getApiBase())}" required /></label>
         <button class="btn btn-primary btn-sm" type="submit">Save</button>
       </form>
       <p class="text-faint" style="font-size:0.78rem;margin-top:10px;">
         If requests fail with a network error, check that <code>CORS_ORIGIN</code> in the backend's
         <code>.env</code> matches this page's origin (<code>${esc(location.origin)}</code>) exactly.
       </p>`);
     qs('#apiBaseForm').addEventListener('submit', (e) => {
       e.preventDefault();
       setApiBase(e.target.base.value.trim());
       closeModal();
       toast('Backend URL saved', 'success');
     });
   });
   
   /* ---------------------------------------------------------------------
      Init
      --------------------------------------------------------------------- */
   
   async function init() {
     const access = localStorage.getItem(STORAGE.access);
     if (access) {
       try {
         const res = await api.me();
         state.user = res.data;
         renderAuthUI();
         await primeLikedVideos();
       } catch {
         clearSession();
       }
     } else {
       renderAuthUI();
     }
     if (!location.hash) location.hash = state.user ? '#/browse' : '#/auth';
     renderRoute();
   }
   
   init();