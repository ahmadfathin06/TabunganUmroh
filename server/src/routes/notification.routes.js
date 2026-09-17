import { Router } from 'express';
import notificationController from '../controllers/notification.controller.js';
import authenticate from '../middlewares/auth.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import { pushSubscribeSchema, pushUnsubscribeSchema } from '../validations/notification.validation.js';
import { notificationsLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = Router();

// Limiter dipasang SEBELUM authenticate agar request berlebih tidak sampai
// memicu query DB (authenticate memeriksa user ke database tiap request).
router.use(notificationsLimiter, authenticate);

router.get('/my', notificationController.getMine);
router.get('/push/public-key', notificationController.getVapidPublicKey);
router.post('/push/subscribe', validate(pushSubscribeSchema), notificationController.subscribe);
router.post('/push/unsubscribe', validate(pushUnsubscribeSchema), notificationController.unsubscribe);
router.post('/push/test', notificationController.sendTestPush);
router.put('/read-all', notificationController.markAllRead);
router.put('/:id/read', notificationController.markRead);

export default router;