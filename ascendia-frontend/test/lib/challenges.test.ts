import { ChallengesApi } from '../../src/lib/challenges';

// Mock fetch globally
global.fetch = jest.fn();

describe('ChallengesApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should fetch list of challenges', async () => {
      const mockChallenges = {
        incoming: [],
        active: [],
        completed: [],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockChallenges,
      });

      const result = await ChallengesApi.list();
      expect(result).toEqual(mockChallenges);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/challenges'),
        expect.objectContaining({
          credentials: 'include',
        })
      );
    });
  });

  describe('detail', () => {
    it('should fetch challenge detail', async () => {
      const mockChallenge = {
        _id: '123',
        initiator: { _id: 'user1', username: 'User1' },
        challenged: { _id: 'user2', username: 'User2' },
        habit: { _id: 'habit1', name: 'Exercise' },
        status: 'active',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockChallenge,
      });

      const result = await ChallengesApi.detail('123');
      expect(result).toEqual(mockChallenge);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/challenges/123'),
        expect.any(Object)
      );
    });
  });

  describe('create', () => {
    it('should create a new challenge', async () => {
      const payload = {
        challengedUsername: 'user2',
        habitId: 'habit1',
        targetValue: 10,
        duration: 7,
      };

      const mockResponse = { _id: '456', ...payload, status: 'pending' };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await ChallengesApi.create(payload);
      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/challenges'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(payload),
        })
      );
    });
  });

  describe('respond', () => {
    it('should accept a challenge', async () => {
      const payload = { accept: true };
      const mockResponse = { _id: '123', status: 'active' };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await ChallengesApi.respond('123', payload);
      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/challenges/123/respond'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('requestFinish', () => {
    it('should request to finish a challenge', async () => {
      const mockResponse = { _id: '123', status: 'finish_requested' };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await ChallengesApi.requestFinish('123');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('declineFinish', () => {
    it('should decline finish request', async () => {
      const mockResponse = { _id: '123', status: 'active' };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await ChallengesApi.declineFinish('123');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('remove', () => {
    it('should delete a challenge', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      await ChallengesApi.remove('123');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/challenges/123'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('error handling', () => {
    it('should throw error on failed request', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => JSON.stringify({ error: 'Invalid data' }),
      });

      await expect(ChallengesApi.list()).rejects.toThrow('Invalid data');
    });
  });
});
