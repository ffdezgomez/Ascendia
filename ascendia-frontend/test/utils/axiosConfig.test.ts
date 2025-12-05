import axiosInstance from '../../src/utils/axiosConfig';

describe('axiosConfig', () => {
  it('should create axios instance with correct baseURL', () => {
    expect(axiosInstance.defaults.baseURL).toBeDefined();
  });

  it('should have withCredentials set to true', () => {
    expect(axiosInstance.defaults.withCredentials).toBe(true);
  });

  it('should have Content-Type header set to application/json', () => {
    expect(axiosInstance.defaults.headers['Content-Type']).toBe('application/json');
  });
});
