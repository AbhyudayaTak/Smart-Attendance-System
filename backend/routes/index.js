const express = require('express');

const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');
const classRoutes = require('./class.routes');
const sessionRoutes = require('./session.routes');
const attendanceRoutes = require('./attendance.routes');
const reportRoutes = require('./report.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/classes', classRoutes);
router.use('/sessions', sessionRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/reports', reportRoutes);

module.exports = router;


