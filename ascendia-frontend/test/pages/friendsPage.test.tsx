import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import FriendsPage from '../../src/pages/FriendsPage';

jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: jest.fn(),
    useMutation: jest.fn(() => ({ mutate: jest.fn(), mutateAsync: jest.fn() })),
    useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn(), removeQueries: jest.fn() })),
    QueryClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    QueryClient: function MockClient() {},
  };
});

const mockedUseQuery = require('@tanstack/react-query').useQuery as jest.Mock;

describe('FriendsPage', () => {
  beforeEach(() => {
    mockedUseQuery.mockImplementation((options: any) => {
      const key = Array.isArray(options?.queryKey) ? options.queryKey.join(':') : '';
      if (key.startsWith('friends:overview')) {
        return { data: { friends: [], incoming: [], outgoing: [] }, isLoading: false, isError: false } as any;
      }
      if (key.startsWith('friends:search')) {
        return { data: null, isLoading: false, isFetching: false, isError: false } as any;
      }
      return { data: null, isLoading: false, isError: false } as any;
    });
  });

  afterEach(() => {
    mockedUseQuery.mockReset();
  });

  it('renders friends header', () => {
    render(
      <MemoryRouter>
        <FriendsPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Amistades/i })).toBeInTheDocument();
    expect(screen.getByText(/Busca usuarios/i)).toBeInTheDocument();
  });
});
