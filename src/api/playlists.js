import api from './axiosClient'

export const createPlaylist = (payload) => api.post('/playlist', payload)

export const getUserPlaylists = (userId) => api.get(`/playlist/user/${userId}`)

export const getPlaylistById = (playlistId) => api.get(`/playlist/${playlistId}`)

export const updatePlaylist = (playlistId, payload) =>
  api.patch(`/playlist/${playlistId}`, payload)

export const deletePlaylist = (playlistId) => api.delete(`/playlist/${playlistId}`)

export const addVideoToPlaylist = (videoId, playlistId) =>
  api.patch(`/playlist/add/${videoId}/${playlistId}`)

export const removeVideoFromPlaylist = (videoId, playlistId) =>
  api.patch(`/playlist/remove/${videoId}/${playlistId}`)
