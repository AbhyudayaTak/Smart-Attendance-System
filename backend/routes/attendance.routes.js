const express = require('express');
const { Session, Attendance, Class } = require('../models');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/attendance/report - get attendance report for teacher
router.get('/report', auth('teacher'), async (req, res) => {
  try {
    const { classId, startDate, endDate } = req.query;

    // Get teacher's classes
    const classQuery = { teacher: req.user.userId };
    if (classId) {
      classQuery._id = classId;
    }
    const classes = await Class.find(classQuery);
    const classIds = classes.map((c) => c._id);

    // Build date filter
    const dateFilter = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate);
    }

    // Get sessions
    const sessionQuery = { class: { $in: classIds } };
    if (Object.keys(dateFilter).length > 0) {
      sessionQuery.scheduledStart = dateFilter;
    }

    const sessions = await Session.find(sessionQuery)
      .populate('class', 'name code students')
      .populate('qrCodes.attendees.student', 'name email studentId')
      .sort({ scheduledStart: -1 });

    // Build report from all sessions and their QR codes
    const report = [];
    sessions.forEach(session => {
      const lateThreshold = new Date(session.scheduledStart.getTime() + 10 * 60 * 1000);
      
      session.qrCodes.forEach(qr => {
        qr.attendees.forEach(attendee => {
          if (attendee.student) {
            let status = 'Present';
            if (attendee.markedAt > lateThreshold) {
              status = 'Late';
            }

            report.push({
              _id: `${session._id}-${attendee.student._id}`,
              student: attendee.student,
              class: session.class,
              session: {
                _id: session._id,
                title: session.title,
                scheduledStart: session.scheduledStart,
              },
              markedAt: attendee.markedAt,
              status,
            });
          }
        });
      });
    });

    // Sort by marked time (newest first)
    report.sort((a, b) => new Date(b.markedAt) - new Date(a.markedAt));

    res.json(report);
  } catch (e) {
    console.error('Get attendance report error', e);
    res.status(500).json({ message: 'Failed to fetch attendance report' });
  }
});

// GET /api/attendance/today - get today's attendance for teacher
router.get('/today', auth('teacher'), async (req, res) => {
  try {
    const classes = await Class.find({ teacher: req.user.userId });
    const classIds = classes.map((c) => c._id);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const sessions = await Session.find({
      class: { $in: classIds },
      scheduledStart: { $gte: startOfDay, $lte: endOfDay },
    })
      .populate('class', 'name code')
      .populate('qrCodes.attendees.student', 'name email studentId');

    const report = [];
    sessions.forEach(session => {
      const lateThreshold = new Date(session.scheduledStart.getTime() + 10 * 60 * 1000);
      
      session.qrCodes.forEach(qr => {
        qr.attendees.forEach(attendee => {
          if (attendee.student) {
            let status = 'Present';
            if (attendee.markedAt > lateThreshold) {
              status = 'Late';
            }

            report.push({
              _id: `${session._id}-${attendee.student._id}`,
              student: attendee.student,
              class: session.class,
              session: {
                _id: session._id,
                title: session.title,
              },
              markedAt: attendee.markedAt,
              status,
            });
          }
        });
      });
    });

    // Sort by marked time (newest first)
    report.sort((a, b) => new Date(b.markedAt) - new Date(a.markedAt));

    res.json(report);
  } catch (e) {
    console.error('Get today attendance error', e);
    res.status(500).json({ message: 'Failed to fetch attendance' });
  }
});

// GET /api/attendance/student - get student's own attendance history
router.get('/student', auth('student'), async (req, res) => {
  try {
    const studentId = req.user.userId;

    // Find all sessions where this student has marked attendance
    const sessions = await Session.find({
      'qrCodes.attendees.student': studentId,
    })
      .populate('class', 'name code')
      .sort({ scheduledStart: -1 })
      .limit(50);

    const history = [];
    sessions.forEach(session => {
      const lateThreshold = new Date(session.scheduledStart.getTime() + 10 * 60 * 1000);
      
      session.qrCodes.forEach(qr => {
        const attendance = qr.attendees.find(a => a.student?.equals(studentId));
        if (attendance) {
          let status = 'Present';
          if (attendance.markedAt > lateThreshold) {
            status = 'Late';
          }

          history.push({
            _id: `${session._id}-${studentId}`,
            class: session.class,
            session: {
              _id: session._id,
              title: session.title,
              scheduledStart: session.scheduledStart,
            },
            markedAt: attendance.markedAt,
            status,
          });
        }
      });
    });

    // Sort by marked time (newest first)
    history.sort((a, b) => new Date(b.markedAt) - new Date(a.markedAt));

    res.json(history);
  } catch (e) {
    console.error('Get student attendance error', e);
    res.status(500).json({ message: 'Failed to fetch attendance history' });
  }
});

// POST /api/attendance/mark - student marks attendance using QR token
router.post('/mark', auth('student'), async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Missing token' });
    }

    const studentId = req.user.userId;

    // Find session with this QR token
    const session = await Session.findOne({
      'qrCodes.token': token,
    }).populate('class');

    if (!session) {
      return res.status(404).json({ message: 'Invalid QR code' });
    }

    // Find the specific QR code
    const qrCode = session.qrCodes.find(qr => qr.token === token);
    if (!qrCode) {
      return res.status(404).json({ message: 'QR code not found' });
    }

    const now = new Date();

    // Check if QR is active and not expired
    if (!qrCode.active) {
      return res.status(400).json({ message: 'QR code is no longer active' });
    }

    if (now > qrCode.expiresAt) {
      return res.status(400).json({ message: 'QR code has expired' });
    }

    // Check if student is enrolled in this class
    if (!session.class.students.some((s) => s.equals(studentId))) {
      return res.status(403).json({ message: 'You are not enrolled in this class' });
    }

    // Check if student already marked attendance for this session (any QR)
    const alreadyMarked = session.qrCodes.some(qr => 
      qr.attendees.some(a => a.student?.equals(studentId))
    );

    if (alreadyMarked) {
      return res.status(200).json({ message: 'Attendance already marked for this session' });
    }

    // Add student to QR attendees
    qrCode.attendees.push({
      student: studentId,
      markedAt: now,
    });

    // Mark nested array as modified for Mongoose to detect the change
    session.markModified('qrCodes');
    await session.save();

    // Determine status
    const lateThreshold = new Date(session.scheduledStart.getTime() + 10 * 60 * 1000);
    const status = now <= lateThreshold ? 'Present' : 'Late';

    res.json({ 
      message: `Attendance marked successfully! Status: ${status}`,
      status,
      class: session.class.name,
      session: session.title,
    });
  } catch (e) {
    console.error('Mark attendance error', e);
    res.status(500).json({ message: 'Error marking attendance' });
  }
});

module.exports = router;