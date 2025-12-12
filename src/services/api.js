import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || '/.netlify/functions'

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const businessesAPI = {
  getAll: (params) => api.get('/businesses', { params }),
  getById: (id) => api.get(`/business-detail?id=${id}`),
  search: (query) => api.get(`/business-search?q=${encodeURIComponent(query)}`),
  create: (data) => api.post('/admin/businesses', data),
  update: (id, data) => api.put(`/admin/businesses?id=${id}`, data),
  delete: (id) => api.delete(`/admin/businesses?id=${id}`),
}

export const categoriesAPI = {
  getAll: () => api.get('/categories'),
  create: (data) => api.post('/admin/categories', data),
  update: (id, data) => api.put(`/admin/categories?id=${id}`, data),
  delete: (id) => api.delete(`/admin/categories?id=${id}`),
}

export const reviewsAPI = {
  getByBusiness: (businessId) => api.get(`/reviews?businessId=${businessId}`),
  create: (data) => api.post('/reviews', data),
}

export const contactAPI = {
  submit: (data) => api.post('/contact', data),
}

export const authAPI = {
  login: (credentials) => api.post('/auth-login', credentials),
}

export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getContacts: () => api.get('/admin/contacts'),
}

export const scrapeAPI = {
  scrapeBusiness: (data) => api.post('/scrape-business', data),
}

export default api

