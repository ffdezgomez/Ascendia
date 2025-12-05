import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import RecoverResetPage from '../../src/pages/RecoverResetPage';

jest.mock('../../src/services/authService', () => ({
  authService: {
    resetPassword: jest.fn(async () => ({})),
  },
}));

const { authService } = jest.requireMock('../../src/services/authService');

describe('RecoverResetPage', () => {
  it('submits reset form and shows success toast', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/reset', search: '?token=abc123token' }] }>
        <RecoverResetPage />
      </MemoryRouter>
    );

    await userEvent.clear(screen.getByPlaceholderText(/token del correo/i));
    await userEvent.type(screen.getByPlaceholderText(/token del correo/i), 'abc123token');
    await userEvent.type(screen.getByPlaceholderText(/\*\*\*\*\*\*\*\*/), 'StrongPass9');
    await userEvent.click(screen.getByRole('button', { name: /guardar nueva contraseña/i }));

    await waitFor(() => expect(authService.resetPassword).toHaveBeenCalledWith('abc123token', 'StrongPass9'));
    expect(await screen.findByText(/Contraseña actualizada/i)).toBeInTheDocument();
  });
});
