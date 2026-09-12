import api from './axiosClient'

export const toggleVideoLike = (videoId) => api.post(`/likes/toggle/v/${videoId}`)

export const toggleCommentLike = (commentId) =>
  api.post(`/likes/toggle/c/${commentId}`)

export const getLikedVideos = () => api.get('/likes/videos')
