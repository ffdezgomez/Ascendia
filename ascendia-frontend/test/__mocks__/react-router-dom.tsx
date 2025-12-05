import React from 'react'

// Minimal react-router mock to keep page smoke tests running without real routing
const RouterShell = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="router-shell">{children}</div>
)

export const MemoryRouter = ({ children }: { children: React.ReactNode }) => (
  <RouterShell>{children}</RouterShell>
)

export const BrowserRouter = MemoryRouter

export const Routes = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const Route = ({ element }: { element?: React.ReactNode }) => <>{element ?? null}</>
export const Outlet = ({ children }: { children?: React.ReactNode }) => <>{children ?? null}</>
export const Navigate = ({ to }: { to?: unknown }) => (
  <div data-testid="navigate" data-to={typeof to === 'string' ? to : JSON.stringify(to ?? '')} />
)

export const Link = ({ to, children, ...rest }: { to?: unknown; children?: React.ReactNode }) => (
  <a href={typeof to === 'string' ? to : '#'} {...rest}>
    {children}
  </a>
)

export const NavLink = Link

const noop = () => {}
export const useNavigate = () => noop
export const useLocation = () => ({ pathname: '/', search: '', hash: '', state: null, key: 'mock' })
export const useParams = () => ({})
export const useSearchParams = () => [new URLSearchParams(), noop] as const
export const useRouteError = () => null
export const createSearchParams = (init?: string | Record<string, string> | URLSearchParams) => new URLSearchParams(init as any)
