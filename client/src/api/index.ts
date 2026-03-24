import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(cfg => {
  const tg = (window as any).Telegram?.WebApp
  if (tg?.initData) {
    cfg.headers['x-telegram-init-data'] = tg.initData
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
  claimReferralBonus: () => api.post('/creators/referral-task'),
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
  getCreatorDetail: (id: number) => api.get(`/admin/creators/${id}`),
  approveCreator: (id: number) => api.post(`/admin/creators/${id}/approve`),
  rejectCreator: (id: number, reason: string) => api.post(`/admin/creators/${id}/reject`, { reason }),
  getBusinesses: (status = 'pending') => api.get('/admin/businesses', { params: { status } }),
  getBusinessDetail: (id: number) => api.get(`/admin/businesses/${id}`),
  approveBusiness: (id: number) => api.post(`/admin/businesses/${id}/approve`),
  rejectBusiness: (id: number) => api.post(`/admin/businesses/${id}/reject`),
  getOffers: (status?: string) => api.get('/admin/offers', { params: status ? { status } : {} }),
  updateOffer: (id: number, d: any) => api.put(`/admin/offers/${id}`, d),
  getApplications: (offerId: number) => api.get(`/admin/offers/${offerId}/applications`),
  selectCreator: (appId: number) => api.post(`/admin/applications/${appId}/select`),
  getProjects: () => api.get('/admin/projects'),
  getProjectDetail: (id: number) => api.get(`/admin/projects/${id}`),
  updateProjectStatus: (id: number, status: string) => api.post(`/admin/projects/${id}/status`, { status }),
  getReferrals: () => api.get('/admin/referrals'),
  getBalanceRequests: (status = 'pending') => api.get('/balance/admin/requests', { params: { status } }),
  approveBalance: (id: number) => api.post(`/balance/admin/${id}/approve`),
  rejectBalance: (id: number) => api.post(`/balance/admin/${id}/reject`),
  adjustBalance: (telegramId: number, amount: number, note: string) => api.post('/admin/balance/adjust', { telegram_id: String(telegramId), amount, type: amount > 0 ? 'bonus' : 'adjustment', description: note }),
}

export const balanceApi = {
  getInfo: () => api.get('/balance'),
  request: (d: { type: 'topup' | 'withdraw'; amount: number; details: string }) => api.post('/balance/request', d),
}

export const aiApi = {
  message: (text: string) => api.post('/ai/message', { message: text }),
  history: () => api.get('/ai/history'),
}

export const notifApi = {
  list: () => api.get('/creators/notifications'),
  readAll: () => api.post('/creators/notifications/read'),
}

export const supportTicketApi = {
  getTicket: (type: string) => api.get(`/support/ticket/${type}`),
  sendMessage: (type: string, data: { text?: string; file_url?: string; file_name?: string; file_type?: string }) =>
    api.post(`/support/ticket/${type}/message`, data),
}

export const adminSupportApi = {
  getTickets: () => api.get('/admin/support/tickets'),
  getMessages: (id: number) => api.get(`/admin/support/tickets/${id}/messages`),
  reply: (id: number, data: { text?: string; file_url?: string; file_name?: string; file_type?: string }) =>
    api.post(`/admin/support/tickets/${id}/reply`, data),
  close: (id: number) => api.post(`/admin/support/tickets/${id}/close`),
}

export const communityApi = {
  getMessages: () => api.get('/community/messages'),
  getNew: (afterId: number) => api.get('/community/messages/new', { params: { after_id: afterId } }),
  send: (data: { text?: string; file_url?: string; file_type?: string; file_name?: string; is_voice?: boolean; is_video_note?: boolean }) =>
    api.post('/community/messages', data),
}

export const newsApi = {
  list: () => api.get('/news'),
  create: (d: { title: string; body: string; emoji: string; pinned?: boolean }) => api.post('/admin/news', d),
  delete: (id: number) => api.delete(`/admin/news/${id}`),
  pin: (id: number) => api.patch(`/admin/news/${id}/pin`),
}

export default api
