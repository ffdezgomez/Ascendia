import { NotificationsApi } from '../../src/lib/notifications';
import axiosInstance from '../../src/utils/axiosConfig';

jest.mock('../../src/utils/axiosConfig');

describe('NotificationsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should fetch notifications with default limit', async () => {
      const mockNotifications = {
        notifications: [
          { _id: '1', type: 'friend_request', read: false },
          { _id: '2', type: 'challenge', read: true },
        ],
        unreadCount: 1,
      };

      (axiosInstance.get as jest.Mock).mockResolvedValueOnce({
        data: mockNotifications,
      });

      const result = await NotificationsApi.list();
      expect(result).toEqual(mockNotifications);
      expect(axiosInstance.get).toHaveBeenCalledWith('/notifications?limit=20');
    });

    it('should fetch notifications with custom limit', async () => {
      const mockNotifications = { notifications: [], unreadCount: 0 };

      (axiosInstance.get as jest.Mock).mockResolvedValueOnce({
        data: mockNotifications,
      });

      await NotificationsApi.list(50);
      expect(axiosInstance.get).toHaveBeenCalledWith('/notifications?limit=50');
    });
  });

  describe('markRead', () => {
    it('should mark notification as read', async () => {
      const mockNotification = { _id: '123', type: 'friend_request', read: true };

      (axiosInstance.post as jest.Mock).mockResolvedValueOnce({
        data: { notification: mockNotification },
      });

      const result = await NotificationsApi.markRead('123');
      expect(result).toEqual(mockNotification);
      expect(axiosInstance.post).toHaveBeenCalledWith('/notifications/123/read');
    });
  });

  describe('markAllRead', () => {
    it('should mark all notifications as read', async () => {
      const mockResponse = { updated: 5 };

      (axiosInstance.post as jest.Mock).mockResolvedValueOnce({
        data: mockResponse,
      });

      const result = await NotificationsApi.markAllRead();
      expect(result).toEqual(mockResponse);
      expect(axiosInstance.post).toHaveBeenCalledWith('/notifications/read-all');
    });
  });

  describe('delete', () => {
    it('should delete a notification', async () => {
      (axiosInstance.delete as jest.Mock).mockResolvedValueOnce({});

      await NotificationsApi.delete('123');
      expect(axiosInstance.delete).toHaveBeenCalledWith('/notifications/123');
    });
  });
});
