import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import UserHomePage from '../../src/pages/UserHomePage';

jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: jest.fn(),
    useMutation: jest.fn(),
    useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
    QueryClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    QueryClient: function MockClient() {},
  };
});

jest.mock('../../src/components/dashboard/MetricsWidget', () => ({
  MetricsWidget: ({ stats }: { stats?: { activeHabits?: number } }) => (
    <div data-testid="metrics-widget">{stats?.activeHabits ?? 0} activos</div>
  ),
}));
jest.mock('../../src/components/dashboard/HabitsWidget', () => ({
  HabitsWidget: ({ habits }: { habits: any[] }) => <div data-testid="habits-widget">{habits?.length ?? 0} hábitos</div>,
}));
jest.mock('../../src/components/dashboard/FriendsWidget', () => ({
  FriendsWidget: ({ friends }: { friends: any[] }) => <div data-testid="friends-widget">{friends?.length ?? 0} amigos</div>,
}));
jest.mock('../../src/components/dashboard/ChallengesWidget', () => ({
  ChallengesWidget: ({ challenges }: { challenges: any[] }) => (
    <div data-testid="challenges-widget">{challenges?.length ?? 0} retos</div>
  ),
}));
jest.mock('../../src/components/habits/HabitCreateModal', () => ({
  HabitCreateModal: () => <div data-testid="habit-modal" />,
}));

jest.mock('../../src/components/habits/HabitGraph', () => ({
  HabitGraph: ({ habitName }: { habitName: string }) => <div data-testid="habit-graph">{habitName}</div>,
}));

jest.mock('../../src/components/UI', () => ({
  ErrorPanel: ({ message }: { message: string }) => <div>{message}</div>,
  IconSpinner: () => <div data-testid="spinner" />,
}));

jest.mock('swiper/react', () => ({
  Swiper: ({ children }: { children: React.ReactNode }) => <div data-testid="swiper">{children}</div>,
  SwiperSlide: ({ children }: { children: React.ReactNode }) => <div data-testid="slide">{children}</div>,
}), { virtual: true });
jest.mock('swiper/modules', () => ({
  Navigation: jest.fn(),
  Pagination: jest.fn(),
}), { virtual: true });
jest.mock('swiper/css', () => '', { virtual: true });
jest.mock('swiper/css/navigation', () => '', { virtual: true });
jest.mock('swiper/css/pagination', () => '', { virtual: true });

const mockedUseQuery = require('@tanstack/react-query').useQuery as jest.Mock;
const mockedUseMutation = require('@tanstack/react-query').useMutation as jest.Mock;

beforeEach(() => {
  mockedUseQuery.mockReset();
  mockedUseMutation.mockReturnValue({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
    error: null,
  });
});

describe('UserHomePage', () => {
  it('shows loading state', () => {
    mockedUseQuery.mockImplementation((options: any) => {
      if (options?.queryKey?.[0] === 'dashboard') {
        return { isLoading: true, isError: false };
      }
      return { data: null, isLoading: false, isError: false };
    });

    render(
      <MemoryRouter>
        <UserHomePage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Cargando dashboard/i)).toBeInTheDocument();
  });

  it('shows error state', () => {
    mockedUseQuery.mockImplementation((options: any) => {
      if (options?.queryKey?.[0] === 'dashboard') {
        return { isLoading: false, isError: true, error: new Error('boom') };
      }
      return { data: null, isLoading: false, isError: false };
    });

    render(
      <MemoryRouter>
        <UserHomePage />
      </MemoryRouter>
    );

    expect(screen.getByText(/boom/)).toBeInTheDocument();
  });

  it('renders main dashboard content with data', () => {
    mockedUseQuery.mockImplementation((options: any) => {
      const key = options?.queryKey?.[0];
      if (key === 'dashboard') {
        return {
          data: {
            habits: [
              {
                id: '1',
                name: 'Leer',
                category: 'study',
                type: 'count',
                completedToday: false,
                hoursThisMonth: 2,
                streak: 3,
                emoji: '📚',
                color: 'zinc',
              },
            ],
            challenges: [{ id: 'c1', title: 'Reto', daysLeft: 3, participants: 2 }],
          },
          isLoading: false,
          isError: false,
        };
      }
      if (key === 'friends') {
        return { data: { friends: [{ id: 'f1', name: 'Ana' }] }, isLoading: false, isError: false };
      }
      if (key === 'allHabitsMetrics') {
        return {
          data: { habits: [{ habitId: '1', habitName: 'Leer', category: 'study', emoji: '📚', color: 'zinc' }] },
          isLoading: false,
          error: null,
        };
      }
      return { data: null, isLoading: false, isError: false };
    });

    render(
      <MemoryRouter>
        <UserHomePage />
      </MemoryRouter>
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText(/Mis Hábitos/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Amigos/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Retos Activos/i)).toBeInTheDocument();
    expect(screen.getByTestId('metrics-widget')).toHaveTextContent('1 activos');
  });
});
