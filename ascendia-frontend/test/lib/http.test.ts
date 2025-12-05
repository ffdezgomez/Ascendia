import { http } from '../../src/lib/http';

// Mock fetch globally
global.fetch = jest.fn();

describe('http', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should make a GET request and return data', async () => {
    const mockData = { id: 1, name: 'Test' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockData),
    });

    const result = await http('/test');
    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
      })
    );
  });

  it('should make a POST request with body', async () => {
    const mockData = { success: true };
    const postData = { name: 'New Item' };
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockData),
    });

    const result = await http('/items', { method: 'POST', body: postData });
    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(postData),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('should handle 204 No Content response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 204,
      text: async () => '',
    });

    const result = await http('/delete', { method: 'DELETE' });
    expect(result).toBeUndefined();
  });

  it('should throw error on failed request', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: async () => JSON.stringify({ error: 'Resource not found' }),
    });

    await expect(http('/not-found')).rejects.toThrow('Resource not found');
  });

  it('should handle PUT request', async () => {
    const mockData = { updated: true };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockData),
    });

    const result = await http('/items/1', { method: 'PUT', body: { name: 'Updated' } });
    expect(result).toEqual(mockData);
  });

  it('should handle PATCH request', async () => {
    const mockData = { patched: true };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockData),
    });

    const result = await http('/items/1', { method: 'PATCH', body: { field: 'value' } });
    expect(result).toEqual(mockData);
  });

  it('should include custom headers', async () => {
    const mockData = { success: true };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockData),
    });

    await http('/test', { headers: { 'X-Custom': 'header' } });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Custom': 'header',
        }),
      })
    );
  });
});
