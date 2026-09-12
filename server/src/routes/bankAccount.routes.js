import { Router } from 'express';
import bankAccountController from '../controllers/bankAccount.controller.js';

const router = Router();

router.get('/', bankAccountController.getActiveOnes);

export default router;