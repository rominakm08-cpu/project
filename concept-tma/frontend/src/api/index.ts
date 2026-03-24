import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(cfg => {
  const tg = (window as any).Telegram?.WebApp
  if (tg?.initData) {
    cfg.headers['x-telegram-init-data'] = tg.initData
  } else if (import.meta.env.DEV) {
    cfg.headers['x-test-user'] = JSON.stringify({ id: 123456789, first_name: 'Test', username: 'testuser' })
  }
  return cfg
})

export const authApi = {
  login: () => api.post('/auth/login'),
}

export const creatorApi = {
  register: (d: any) => api.post('/creators/register', d),
  me: () => api.get('/creators/me'),
  update: (d: any) => api.put('/creators/me', d),
  getOffers: () => api.get('/creators/offers'),
  applyOffer: (id: number, message: string) => api.post(`/creators/offers/${id}/apply`, { message }),
  getProjects: () => api.get('/creators/projects'),
  uploadContent: (id: number, url: string) => api.post(`/creators/projects/${id}/upload`, { content_url: url }),
  addPoints: (action: string) => api.post('/creators/points', { action }),
}

export const businessApi = {
  register: (d: any) => api.post('/business/register', d),
  me: () => api.get('/business/me'),
  createOffer: (d: any) => api.post('/business/offers', d),
  getOffers: () => api.get('/business/offers'),
  getProjects: () => api.get('/business/projects'),
  reviewProject: (id: number, action: string, feedback?: string) =>
    api.post(`/business/projects/${id}/review`, { action, feedback }),
}

export const adminApi = {
  stats: () => api.get('/admin/stats'),
  getCreators: (status = 'pending') => api.get('/admin/creators', { params: { status } }),
  approveCreator: (id: number) => api.post(`/admin/creators/${id}/approve`),
  rejectCreator: (id: number, reason: string) => api.post(`/admin/creators/${id}/reject`, { reason }),
  getBusinesses: (status = 'pending') => api.get('/admin/businesses', { params: { status } }),
  approveBusiness: (id: number) => api.post(`/admin/businesses/${id}/approve`),
  rejectBusiness: (id: number) => api.post(`/admin/businesses/${id}/reject`),
  getOffers: (status?: string) => api.get('/admin/offers', { params: status ? { status } : {} }),
  updateOffer: (id: number, d: any) => api.put(`/admin/offers/${id}`, d),
  getApplications: (offerId: number) => api.get(`/admin/offers/${offerId}/applications`),
  selectCreator: (appId: number) => api.post(`/admin/applications/${appId}/select`),
  getProjects: () => api.get('/admin/projects'),
  updateProjectStatus: (id: number, status: string) => api.post(`/admin/projects/${id}/status`, { status }),
  getReferrals: () => api.get('/admin/referrals'),
}

export default api
