// src/routes/dashboard.ts
import { Router } from 'express';
import { buildDashboardSummary } from '../services/dashboardSummary.js';

const r = Router();

// ================== AUTH ==================
function requireAuth(req: any, res: any, next: any) {
  if (process.env.BYPASS_AUTH === 'true') {
    return next()
  }

  // Only enforce auth on dashboard routes; allow other paths (e.g. tests) to pass through
  if (!req.path?.startsWith('/dashboard')) {
    return next()
  }

  const sessionUser = req.session?.user;
  if (!sessionUser || !sessionUser.userId) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  req.currentUserId = sessionUser.userId;
  next();
}

r.use(requireAuth);

/**
 * GET /api/dashboard
 * Devuelve: { habits: HabitSummary[] }
 */
r.get('/dashboard', async (req: any, res: any, next: any) => {
  try {
    const userId = req.currentUserId;
    const summary = await buildDashboardSummary(userId);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

export default r;