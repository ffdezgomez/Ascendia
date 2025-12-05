import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import LandingPage from '../../src/pages/LandingPage';

describe('LandingPage (smoke)', () => {
  it('renders hero call-to-action', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Crear cuenta gratis')).toBeInTheDocument();
    expect(screen.getByText('Ya tengo cuenta')).toBeInTheDocument();
  });
});
