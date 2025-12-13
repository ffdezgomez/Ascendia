import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import {
  createChallengeHandler,
  deleteChallengeHandler,
  getChallenge,
  getChallenges,
  declineFinishHandler,
  requestFinishHandler,
  respondChallengeHandler
} from '../controllers/challengeController'

type AuthedRequest = Request & { currentUserId: string; session?: any }
type AuthedHandler = (req: AuthedRequest, res: Response, next: NextFunction) => Promise<unknown> | unknown

const router = Router()

function requireAuth(req: Request & { currentUserId?: string; session?: any }, res: Response, next: NextFunction) {
  const sessionUser = req.session?.user
  if (!sessionUser || !sessionUser.userId) {
    return res.status(401).json({ error: 'No autenticado' })
  }
  req.currentUserId = sessionUser.userId
  next()
}

router.use(requireAuth)

function withAuthedHandler(handler: AuthedHandler) {
  return (req: Request, res: Response, next: NextFunction) => handler(req as AuthedRequest, res, next)
}

router.get('/', withAuthedHandler(getChallenges))
router.get('/:challengeId', withAuthedHandler(getChallenge))
router.post('/', withAuthedHandler(createChallengeHandler))
router.post('/:challengeId/respond', withAuthedHandler(respondChallengeHandler))
router.post('/:challengeId/finish', withAuthedHandler(requestFinishHandler))
router.post('/:challengeId/finish/decline', withAuthedHandler(declineFinishHandler))
router.delete('/:challengeId', withAuthedHandler(deleteChallengeHandler))

export default router
