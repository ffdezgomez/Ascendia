import type { Request, Response, NextFunction } from 'express'

export interface RequireAuthOptions {
  /** Optional path prefix to guard; other paths pass through */
  basePath?: string
  /** Allow BYPASS_AUTH env flag to skip the guard (used in tests) */
  allowBypass?: boolean
  /** Custom error message when session is missing */
  errorMessage?: string
}

export function requireAuth(options: RequireAuthOptions = {}) {
  const { basePath, allowBypass = true, errorMessage = 'No autenticado' } = options

  return function authGuard(req: Request & { session?: any; currentUserId?: string }, res: Response, next: NextFunction) {
    if (allowBypass && process.env.BYPASS_AUTH === 'true') {
      return next()
    }

    if (basePath && !req.path?.startsWith(basePath)) {
      return next()
    }

    const sessionUser = req.session?.user
    if (!sessionUser || !sessionUser.userId) {
      return res.status(401).json({ error: errorMessage })
    }

    req.currentUserId = sessionUser.userId
    next()
  }
}

export default requireAuth
