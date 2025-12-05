// src/routes/dashboard.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { buildDashboardSummary } from '../services/dashboardSummary.js';

const r = Router();

r.use(requireAuth({ basePath: '/dashboard' }));

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