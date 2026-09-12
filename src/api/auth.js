import api from './axiosClient'

export const registerUser = (formData) =>
  api.post('/users/register', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const loginUser = (credentials) => api.post('/users/login', credentials)

export const logoutUser = () => api.post('/users/logout')

export const getCurrentUser = () => api.get('/users/current-user')

export const changeCurrentPassword = (payload) =>
  api.post('/users/change-password', payload)

export const updateAccountDetails = (payload) =>
  api.patch('/users/update-account', payload)

export const updateUserAvatar = (formData) =>
  api.patch('/users/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const updateUserCoverImage = (formData) =>
  api.patch('/users/cover-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const getUserChannelProfile = (username) =>
  api.get(`/users/channel/${username}`)

export const getWatchHistory = () => api.get('/users/history')
