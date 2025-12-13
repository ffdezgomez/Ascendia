import axiosInstance from '../utils/axiosConfig'
import type { NotificationListResponse, NotificationPayload } from '../types/notification'

export const NotificationsApi = {
  async list(limit = 20): Promise<NotificationListResponse> {
    const response = await axiosInstance.get(`/notifications?limit=${limit}`)
    return response.data
  },
  async markRead(notificationId: string): Promise<NotificationPayload> {
    const response = await axiosInstance.post(`/notifications/${notificationId}/read`)
    return response.data.notification
  },
  async markAllRead(): Promise<{ updated: number }> {
    const response = await axiosInstance.post('/notifications/read-all')
    return response.data
  },
  async delete(notificationId: string): Promise<void> {
    await axiosInstance.delete(`/notifications/${notificationId}`)
  }
}
