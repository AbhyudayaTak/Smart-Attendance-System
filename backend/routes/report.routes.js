const express = require('express');
const { Session, Attendance } = require('../models');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/reports/class/:classId - attendance for a class
router.get('/class/:classId', auth('teacher'), async (req, res) => {
  const { classId } = req.params;
  const sessions = await Session.find({ class: classId });
  const sessionIds = sessions.map((s) => s._id);

  const attendance = await Attendance.find({ session: { $in: sessionIds } })
    .populate('student', 'name email')
    .populate('session', 'createdAt');

  res.json(attendance);
});

module.exports = router;


