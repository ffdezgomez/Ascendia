import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

jest.mock('../../src/components/FriendAvatar', () => ({
  FriendAvatar: ({ username }: { username: string }) => <div data-testid="friend-avatar">{username}</div>,
}));

jest.mock('../../src/components/UI', () => ({
  ErrorPanel: ({ message }: { message: string }) => <div role="alert">{message}</div>,
  IconSpinner: () => <div data-testid="spinner" />,
}));

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ username: 'ana' }),
    useNavigate: () => jest.fn(),
    useLocation: () => ({ state: undefined }),
  };
});

jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: jest.fn(),
    useMutation: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
    useQueryClient: jest.fn(() => ({
      getQueryData: () => ({ friends: [{ id: 'f1', username: 'ana', avatar: '' }] }),
      invalidateQueries: jest.fn(),
    })),
    QueryClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    QueryClient: function MockClient() {},
  };
});

const mockedUseQuery = require('@tanstack/react-query').useQuery as jest.Mock;
const mockedUseQueryClient = require('@tanstack/react-query').useQueryClient as jest.Mock;
const FriendDashboardPage = require('../../src/pages/FriendDashboardPage').default;

describe('FriendDashboardPage', () => {
  afterEach(() => {
    mockedUseQuery.mockReset();
    mockedUseQueryClient.mockReset();
  });

  it('renders dashboard content when data is available', () => {
    mockedUseQueryClient.mockReturnValue({
      getQueryData: () => ({ friends: [{ id: 'f1', username: 'ana', avatar: '' }] }),
      invalidateQueries: jest.fn(),
    });
    mockedUseQuery.mockImplementation((options: any) => {
      const key = Array.isArray(options?.queryKey) ? options.queryKey.join(':') : '';
      if (key.startsWith('friends:dashboard')) {
        return {
          data: {
            habits: [
              {
                id: 'h1',
                name: 'Correr',
                category: 'fitness',
                emoji: '🏃',
                type: 'count',
                unit: 'veces',
                history: [{ date: '2024-01-01', completed: true }],
                completedToday: false,
                streak: 2,
                totalThisMonth: 5,
                hoursThisMonth: 0,
              },
            ],
            comparisons: [
              {
                id: 'cmp1',
                friendHabit: { id: 'h1', name: 'Correr', unit: 'veces', totalThisMonth: 4 },
                ownerHabit: { id: 'oh1', name: 'Mi correr', unit: 'veces', totalThisMonth: 6 },
                deltaThisMonth: 2,
                unit: 'veces',
              },
            ],
          },
          isLoading: false,
          isError: false,
        };
      }
      if (key.startsWith('friends:comparison-candidates')) {
        return { data: { habits: [], unit: 'veces' }, isLoading: false, isError: false };
      }
      return { data: null, isLoading: false, isFetching: false, isError: false };
    });

    render(
      <MemoryRouter>
        <FriendDashboardPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Correr/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Comparaciones activas/)).toBeInTheDocument();
  });

  it('shows error panel when dashboard query fails', () => {
    mockedUseQueryClient.mockReturnValue({
      getQueryData: () => ({ friends: [{ id: 'f1', username: 'ana', avatar: '' }] }),
      invalidateQueries: jest.fn(),
    });
    mockedUseQuery.mockImplementation((options: any) => {
      const key = Array.isArray(options?.queryKey) ? options.queryKey.join(':') : '';
      if (key.startsWith('friends:dashboard')) {
        return { isLoading: false, isError: true, error: new Error('falló dashboard') };
      }
      return { data: null, isLoading: false, isError: false };
    });

    render(
      <MemoryRouter>
        <FriendDashboardPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('alert')).toHaveTextContent('falló dashboard');
  });
});
