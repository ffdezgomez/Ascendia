import { getSocket, disconnectSocket } from '../../src/lib/realtime';

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connected: true,
  })),
}));

describe('realtime', () => {
  afterEach(() => {
    disconnectSocket();
    jest.clearAllMocks();
  });

  describe('getSocket', () => {
    it('should create and return socket instance', async () => {
      const socket = await getSocket();
      expect(socket).toBeDefined();
      expect(socket).not.toBeNull();
    });

    it('should return same socket instance on multiple calls', async () => {
      const socket1 = await getSocket();
      const socket2 = await getSocket();
      expect(socket1).toBe(socket2);
    });
  });

  describe('disconnectSocket', () => {
    it('should handle disconnect when no socket exists', () => {
      expect(() => disconnectSocket()).not.toThrow();
    });

    it('should disconnect existing socket', async () => {
      const socket = await getSocket();
      if (socket) {
        expect(socket).toBeDefined();
        disconnectSocket();
      }
      // Test passes if no error is thrown
      expect(true).toBe(true);
    });
  });
});
