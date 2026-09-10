const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const depositRoutes = require('./deposit.routes');
const adminRoutes = require('./admin.routes');

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/deposits', depositRoutes);
router.use('/admin', adminRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

module.exports = router;