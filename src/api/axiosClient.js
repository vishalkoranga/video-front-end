import axios from 'axios'

export const baseURL = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api/v1'

const api = axios.create({
  baseURL,
  withCredentials: true,
})

// Attach the access token (kept in localStorage) to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// If a request comes back 401, try to silently refresh the access token
// once, then replay the original request. Requests already queued while
// a refresh is in flight are held and retried with the new token.
let isRefreshing = false
let pendingQueue = []

const flushQueue = (error, token = null) => {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token)
  })
  pendingQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const status = error.response?.status
    const isAuthRoute =
      originalRequest?.url?.includes('/users/login') ||
      originalRequest?.url?.includes('/users/register') ||
      originalRequest?.url?.includes('/users/refresh-token')

    if (status === 401 && !originalRequest._retry && !isAuthRoute) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const refreshToken = localStorage.getItem('refreshToken')
        const { data } = await axios.post(
          `${baseURL}/users/refresh-token`,
          { refreshToken },
          { withCredentials: true }
        )
        const newAccessToken = data.data.accessToken
        const newRefreshToken = data.data.refreshToken

        localStorage.setItem('accessToken', newAccessToken)
        localStorage.setItem('refreshToken', newRefreshToken)

        flushQueue(null, newAccessToken)
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        flushQueue(refreshError, null)
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
