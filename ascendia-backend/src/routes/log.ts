import express from 'express'
import * as logController from '../controllers/logController'
const router = express.Router()


// Middleware de autenticación
function requireAuth(req: any, res: any, next: any) {
  const sessionUser = req.session?.user;
  if (!sessionUser || !sessionUser.userId) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  req.currentUserId = sessionUser.userId;
  next();
}

router.use(requireAuth);

router.post('/', logController.createLog)
router.get('/', logController.getLogs) 
router.get('/:id', logController.getLogById)
router.put('/:id', logController.updateLog)
router.delete('/:id', logController.deleteLog)

export default router;
