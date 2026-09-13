# Videotube — Frontend

A React + plain CSS frontend for the [backend-project](https://github.com/vishalkoranga/backend-project)
video-hosting API. No Tailwind, no CSS-in-JS, no component libraries — every
style is a hand-written `.css` file next to the component it belongs to.

## Stack

- **React 18** with **React Router v6** for routing
- **Axios** for API calls, with automatic access-token refresh on 401s
- **Vite** as the dev server / bundler
- Plain `.css` files (one global `src/index.css` for design tokens + shared
  classes, one CSS file per component/page for anything specific to it)

## Folder structure

```
src/
  api/            One file per backend resource (auth, videos, comments,
                   likes, subscriptions, playlists, dashboard) plus the
                   shared axios client with the token-refresh interceptor.
  context/         AuthContext — holds the logged-in user and exposes
                   login/logout/refreshUser.
  components/      Reusable pieces: Navbar, VideoCard, CommentSection,
                   Avatar, Pagination, modals, ProtectedRoute, etc.
                   Each .jsx has a matching .css alongside it.
  pages/           One component per route (Home, Watch, Channel, Upload,
                   Dashboard, Playlists, Settings, etc.), each with its
                   own .css file.
  utils/           Small formatting helpers (durations, view counts,
                   "time ago", error messages).
  App.jsx          All route definitions.
  main.jsx         Entry point (mounts the router + AuthProvider).
```

## Getting started

1. **Run the backend first.** Clone and start `backend-project` per its own
   README — you'll need MongoDB and Cloudinary credentials configured there.
   By default it listens on `http://localhost:8000`.

2. **Install and configure the frontend:**

   ```bash
   npm install
   cp .env.example .env
   ```

   Edit `.env` if your backend isn't running on the default URL:

   ```
   VITE_API_BASE =http://localhost:8000/api/v1
   ```

3. **Run it:**

   ```bash
   npm run dev
   ```

   Open the printed local URL (usually `http://localhost:5173`).

4. **Register an account** from the UI — an avatar image is required by the
   backend, a cover image is optional — then sign in.

## How auth works

Almost every route in the backend (all of `/videos`, `/comments`, `/likes`,
`/subscriptions`, `/playlist`, `/dashboard`, and most of `/users`) requires a
valid JWT. This frontend stores the `accessToken` and `refreshToken` it gets
back from `/users/login` in `localStorage` and attaches the access token as
an `Authorization: Bearer <token>` header on every request. If a request
comes back `401`, the axios client automatically calls
`/users/refresh-token` once and retries — so sessions survive the access
token's short expiry without the user noticing.

Because nearly the whole API sits behind auth, nearly the whole app does
too: every route except `/login` and `/register` is wrapped in a
`ProtectedRoute` that redirects signed-out visitors to `/login`.

## Notable pages

- **Home / Search** — paginated video grid, sortable by newest/oldest/most
  viewed, backed by `GET /videos`.
- **Watch** — video player, like toggle, subscribe toggle, "save to
  playlist" (with inline create-new-playlist), full comment thread
  (add/edit/delete/like), and owner-only edit/unpublish/delete controls.
- **Channel** — a public profile page (cover, avatar, subscriber count,
  subscribe button) with tabs for that channel's videos and playlists.
- **Studio dashboard** — the channel-stats cards from
  `GET /dashboard/stats` plus a manageable list of your own videos.
- **Playlists** — create, rename, delete, and manage the videos inside a
  playlist.
- **Settings** — update name/email, change password, and update your
  avatar/cover image separately (matching the backend's three separate
  endpoints for these).

## A couple of honest limitations

These mirror gaps in the backend API itself, not bugs in the frontend:

- There's no endpoint that returns a video's or comment's *total* like
  count — only a toggle. The like button reflects your own like state
  (checked against `GET /likes/videos` on load); it doesn't show a count.
- "More from this channel" on the watch page is just that channel's other
  videos — the API doesn't have a recommendation/related-videos endpoint.

## Building for production

```bash
npm run build
```

Outputs static files to `dist/`, deployable anywhere that serves static
assets (just make sure `VITE_API_BASE` points at your deployed backend
and that backend's CORS config allows your frontend's origin with
credentials).
