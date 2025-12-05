import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import DashboardPage from '../../src/pages/DashboardPage';

// Mock heavy child components used inside the page
jest.mock('../../src/components/habits/HabitCreateModal', () => ({
  HabitCreateModal: () => <div data-testid="habit-modal" />,
}));

jest.mock('../../src/components/DatePickerField', () => ({
  DatePickerField: () => <div data-testid="date-picker" />,
}));

jest.mock('../../src/components/UI', () => ({
  ErrorPanel: ({ message }: { message: string }) => <div>{message}</div>,
  IconSpinner: () => <div data-testid="spinner" />,
  InputField: (props: any) => <input data-testid="input" {...props} />,
  Toast: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SavingDot: () => <div data-testid="saving-dot" />,
}));

jest.mock('../../src/constants/emojiOptions', () => ({
  EMOJI_OPTIONS: ['📚', '🔥', '💪'],
}));

jest.mock('../../src/components/FriendAvatar', () => ({
  FriendAvatar: () => <div data-testid="friend-avatar" />, 
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

beforeEach(() => {
  queryClient.clear();
  // Mock dashboard API response to keep render lightweight
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: async () => ({ habits: [] }),
    } as Response)
  ) as unknown as typeof fetch;
});

afterEach(() => {
  (global.fetch as jest.Mock | undefined)?.mockClear?.();
});

describe('DashboardPage (smoke)', () => {
  it('renders dashboard with habits list', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText(/Hábitos/i)).toBeInTheDocument();
  });
});
