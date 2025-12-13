import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from '../src/App'

jest.mock(
  'swiper/react',
  () => ({
    Swiper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SwiperSlide: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
  }),
  { virtual: true }
)

jest.mock(
  'swiper/modules',
  () => ({
    Navigation: {},
    Pagination: {}
  }),
  { virtual: true }
)

jest.mock('swiper/css', () => ({}), { virtual: true })
jest.mock('swiper/css/navigation', () => ({}), { virtual: true })
jest.mock('swiper/css/pagination', () => ({}), { virtual: true })

jest.mock(
  'react-router-dom',
  () => ({
    Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
    Routes: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Route: () => null,
    Navigate: () => null,
    useNavigate: () => () => {},
    useLocation: () => ({ pathname: '/' })
  }),
  { virtual: true }
)

const fetchMock = jest.fn()

beforeAll(() => {
  global.fetch = fetchMock as unknown as typeof fetch
})

beforeEach(() => {
  fetchMock.mockReset()
})

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  )
}

test('shows logged-in navigation when auth succeeds', async () => {
  fetchMock.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({})
  })

  renderApp()

  await waitFor(() => expect(screen.getAllByText(/Perfil/i)).not.toHaveLength(0))
  expect(screen.getAllByText(/Hábitos/i)).not.toHaveLength(0)
  expect(screen.getAllByText(/Retos/i)).not.toHaveLength(0)
  expect(screen.getAllByText(/Amistades/i)).not.toHaveLength(0)
  expect(screen.getByText(/Cerrar sesión/i)).toBeInTheDocument()
  expect(screen.queryByText(/Login/i)).not.toBeInTheDocument()
})

test('shows auth links when API returns 401', async () => {
  fetchMock.mockResolvedValue({
    ok: false,
    status: 401,
    json: () => Promise.resolve({})
  })

  renderApp()

  await waitFor(() => expect(screen.getByText(/Login/i)).toBeInTheDocument())
  expect(screen.getByText(/Empezar/i)).toBeInTheDocument()
  expect(screen.queryByText(/Cerrar sesión/i)).not.toBeInTheDocument()
})
