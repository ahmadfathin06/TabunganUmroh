import { Router } from 'express';
import packageController from '../controllers/package.controller.js';
import authenticate from '../middlewares/auth.middleware.js';
import authorize from '../middlewares/role.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import { createPackageSchema, updatePackageSchema } from '../validations/package.validation.js';

const router = Router();

router.get('/', packageController.getAll);
router.get('/:slug', packageController.getBySlug);
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), validate(createPackageSchema), packageController.create);
router.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), validate(updatePackageSchema), packageController.update);
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), packageController.delete);

export default router;