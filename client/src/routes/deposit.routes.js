const express = require('express');
const router = express.Router();
const depositController = require('../controllers/deposit.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

// User routes
router.post('/', authenticate, depositController.create);
router.post('/:id/upload-proof', authenticate, depositController.uploadProof);
router.get('/my', authenticate, depositController.getMyDeposits);

// Admin routes
router.put('/:id/verify', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), depositController.verify);

module.exports = router;