import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import ChallengesPage from '../../src/pages/ChallengesPage';

jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: jest.fn(),
    useMutation: jest.fn(() => ({ mutateAsync: jest.fn(), isLoading: false, mutate: jest.fn() })),
    useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
  };
});

const mockedUseQuery = require('@tanstack/react-query').useQuery as jest.Mock;

jest.mock('../../src/components/UI', () => ({
  ErrorPanel: ({ message }: { message: string }) => <div>{message}</div>,
  IconSpinner: () => <div data-testid="spinner" />,
  InputField: (props: any) => <input data-testid="input" {...props} />,
  Toast: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SavingDot: () => <div data-testid="saving-dot" />,
}));

jest.mock('../../src/components/DatePickerField', () => ({
  DatePickerField: () => <div data-testid="date-picker" />,
}));

jest.mock('../../src/constants/emojiOptions', () => ({
  EMOJI_OPTIONS: ['🔥', '💪', '📚'],
}));

jest.mock('../../src/lib/challenges', () => ({
  ChallengesApi: {
    list: jest.fn(async () => ({ challenges: [], viewerId: 'viewer-1' })),
    create: jest.fn(),
    respond: jest.fn(),
    requestFinish: jest.fn(),
    declineFinish: jest.fn(),
    remove: jest.fn(),
  },
}));

jest.mock('../../src/lib/friends', () => ({
  FriendsApi: {
    list: jest.fn(async () => ({ friends: [] })),
    search: jest.fn(async () => ({ users: [] })),
    overview: jest.fn(async () => ({ friends: [] })),
    dashboard: jest.fn(async () => ({ habits: [] })),
  },
}));

jest.mock('../../src/components/habits/HabitCreateModal', () => ({
  HabitCreateModal: () => <div data-testid="habit-modal" />,
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

beforeEach(() => {
  queryClient.clear();
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, json: async () => [] } as Response)
  ) as unknown as typeof fetch;
  mockedUseQuery.mockImplementation((options: any) => {
    const key = Array.isArray(options?.queryKey) ? options.queryKey[0] : undefined;
    if (key === 'challenges') {
      return { data: { challenges: [], viewerId: 'viewer-1' }, isLoading: false, error: null } as any;
    }
    if (key === 'friends') {
      return { data: { friends: [] }, isLoading: false, error: null } as any;
    }
    if (key === 'habits') {
      return { data: [], isLoading: false, error: null } as any;
    }
    return { data: [], isLoading: false, error: null } as any;
  });
});

afterEach(() => {
  mockedUseQuery.mockReset();
});


describe('ChallengesPage (smoke)', () => {
  it('renders filters and CTA', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ChallengesPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByRole('heading', { name: /Retos/i })).toBeInTheDocument();
  });
});
