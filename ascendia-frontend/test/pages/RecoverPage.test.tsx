import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import RecoverPage from '../../src/pages/RecoverPage';

jest.mock('../../src/services/authService', () => ({
  authService: {
    forgotPassword: jest.fn(async () => ({ token: 'dev-token-123' })),
  },
}));

const { authService } = jest.requireMock('../../src/services/authService');

describe('RecoverPage', () => {
  it('submits recover form and shows confirmation', async () => {
    render(<RecoverPage />);

    await userEvent.type(screen.getByPlaceholderText(/email\.com/i), 'user@example.com');
    await userEvent.click(screen.getByRole('button', { name: /enviar correo/i }));

    await waitFor(() => expect(authService.forgotPassword).toHaveBeenCalledWith('user@example.com'));
  });
});
