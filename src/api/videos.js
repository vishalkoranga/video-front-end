import api from './axiosClient'

export const getAllVideos = (params) => api.get('/videos', { params })

export const getVideoById = (videoId) => api.get(`/videos/${videoId}`)

export const publishVideo = (formData) =>
  api.post('/videos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const updateVideo = (videoId, formData) =>
  api.patch(`/videos/${videoId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const deleteVideo = (videoId) => api.delete(`/videos/${videoId}`)

export const toggleVideoPublishStatus = (videoId) =>
  api.patch(`/videos/toggle/publish/${videoId}`)
