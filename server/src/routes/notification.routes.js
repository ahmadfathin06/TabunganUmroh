import { Router } from 'express';
import notificationController from '../controllers/notification.controller.js';
import authenticate from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/my', notificationController.getMine);
router.get('/push/public-key', notificationController.getVapidPublicKey);
router.post('/push/subscribe', notificationController.subscribe);
router.post('/push/unsubscribe', notificationController.unsubscribe);
router.post('/push/test', notificationController.sendTestPush);
router.put('/read-all', notificationController.markAllRead);
router.put('/:id/read', notificationController.markRead);

export default router;