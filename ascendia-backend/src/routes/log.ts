import express from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import * as logController from '../controllers/logController'
const router = express.Router()

router.use(requireAuth({ allowBypass: false }));

router.post('/', logController.createLog)
router.get('/', logController.getLogs) 
router.get('/:id', logController.getLogById)
router.put('/:id', logController.updateLog)
router.delete('/:id', logController.deleteLog)

export default router;
