import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import VerifyEmailPage from '../../src/pages/VerifyEmailPage';

jest.mock('react-router-dom', () => {
  const base = jest.requireActual('../__mocks__/react-router-dom');
  return {
    ...base,
    useSearchParams: () => [new URLSearchParams('token=oktoken'), jest.fn()],
    useNavigate: () => jest.fn(),
  };
});

jest.mock('../../src/services/authService', () => ({
  authService: {
    verifyEmail: jest.fn(async () => ({})),
  },
}));

const { authService } = jest.requireMock('../../src/services/authService');

describe('VerifyEmailPage', () => {
  it('shows success when token verifies', async () => {
    authService.verifyEmail.mockResolvedValue({});
    render(<VerifyEmailPage />);

    await waitFor(() => expect(authService.verifyEmail).toHaveBeenCalledWith('oktoken'));
    expect(await screen.findByText(/Correo verificado/i)).toBeInTheDocument();
  });
});
