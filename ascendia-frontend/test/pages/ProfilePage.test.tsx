import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import ProfilePage from '../../src/pages/ProfilePage';

const mockRegister = () => ({ name: 'user', onChange: jest.fn(), onBlur: jest.fn(), ref: jest.fn() });
let lastSubmitHandler: (() => void) | null = null;
const mockHandleSubmit = (fn: any) => {
  lastSubmitHandler = () => fn({ user: 'alice-updated', bio: 'Hola' });
  return lastSubmitHandler;
};
const mockReset = jest.fn();

jest.mock('react-hook-form', () => ({
  useForm: () => ({
    register: mockRegister,
    handleSubmit: mockHandleSubmit,
    reset: mockReset,
    watch: () => 'alice',
    formState: { errors: {}, isSubmitting: false, isDirty: true },
  }),
}));

jest.mock('../../src/components/UI', () => {
  const React = require('react');
  return {
    InputField: React.forwardRef((props: any, ref: any) => {
      const { label, error, ...rest } = props;
      return <input ref={ref} {...rest} />;
    }),
    Toast: ({ children, show }: { children: React.ReactNode; show?: boolean }) => (show ? <div>{children}</div> : null),
    ErrorPanel: ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
      <div>
        {message}
        <button onClick={onRetry}>retry</button>
      </div>
    ),
    IconSpinner: () => <div data-testid="spinner" />,
    SavingDot: () => <div data-testid="saving-dot" />,
  };
});

jest.mock('../../src/lib/profile', () => ({
  ProfileApi: {
    get: jest.fn(),
    update: jest.fn(),
    uploadAvatar: jest.fn(),
  },
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(() => ({ setQueryData: jest.fn() })),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  QueryClient: function MockClient() {},
}));

const mockedUseQuery = require('@tanstack/react-query').useQuery as jest.Mock;
const mockedUseMutation = require('@tanstack/react-query').useMutation as jest.Mock;
const mockedUseQueryClient = require('@tanstack/react-query').useQueryClient as jest.Mock;
const ProfileApi = require('../../src/lib/profile').ProfileApi as any;

const renderPage = () => render(
  <MemoryRouter>
    <ProfilePage />
  </MemoryRouter>
);

describe('ProfilePage', () => {
  beforeEach(() => {
    mockedUseQuery.mockReset();
    mockedUseMutation.mockReset();
    mockedUseQueryClient.mockReset();
    ProfileApi.get.mockReset();
    ProfileApi.update.mockReset();

    mockedUseQueryClient.mockReturnValue({ setQueryData: jest.fn() });
    mockedUseMutation.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
  });

  it('shows loading skeleton', () => {
    mockedUseQuery.mockReturnValue({ data: null, isLoading: true, isError: false });

    const { container } = renderPage();

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('shows error state', () => {
    mockedUseQuery.mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      error: new Error('perfil caído'),
      refetch: jest.fn(),
    });

    renderPage();

    expect(screen.getByText(/perfil caído/i)).toBeInTheDocument();
  });

  it('renders profile data and saves changes', async () => {
    mockedUseQuery.mockReturnValue({
      data: {
        user: 'alice',
        bio: 'Hola',
        email: 'alice@example.com',
        avatar: 'https://example.com/avatar.png',
        habits: ['Leer', 'Entrenar'],
      },
      isLoading: false,
      isError: false,
    });

    ProfileApi.update.mockResolvedValue({
      user: 'alice-updated',
      bio: 'Hola',
      email: 'alice@example.com',
      avatar: 'https://example.com/avatar.png',
      habits: ['Leer', 'Entrenar'],
    });

    let mutateAsync: jest.Mock;
    mockedUseMutation.mockImplementation(({ mutationFn, onSuccess }: any) => {
      mutateAsync = jest.fn(async (payload: any) => {
        const result = await mutationFn(payload);
        onSuccess?.(result);
        return result;
      });
      return { mutateAsync, isPending: false } as any;
    });

    renderPage();

    expect(await screen.findByText(/alice@example.com/)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('tu_usuario'), { target: { value: 'alice-updated' } });
    lastSubmitHandler?.();

    await waitFor(() => expect(mutateAsync!).toHaveBeenCalled());

    expect(ProfileApi.update).toHaveBeenCalledWith({
      user: 'alice-updated',
      bio: 'Hola',
      habits: ['Leer', 'Entrenar'],
    });
    expect(await screen.findByText(/Cambios guardados/i)).toBeInTheDocument();
  });
});
