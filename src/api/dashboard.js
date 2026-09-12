import api from './axiosClient'

export const getChannelStats = () => api.get('/dashboard/stats')

export const getChannelVideos = () => api.get('/dashboard/videos')
