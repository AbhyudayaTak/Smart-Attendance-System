const express = require('express');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { Class, Session, Attendance } = require('../models');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/sessions - get all sessions for teacher's classes
router.get('/', auth('teacher'), async (req, res) => {
  try {
    const classes = await Class.find({ teacher: req.user.userId });
    const classIds = classes.map((c) => c._id);

    const sessions = await Session.find({ class: { $in: classIds } })
      .populate('class', 'name code students')
      .populate('qrCodes.attendees.student', 'name email')
      .sort({ scheduledStart: -1 });

    // Update status based on current time
    const now = new Date();
    const sessionsWithStatus = sessions.map((session) => {
      const obj = session.toObject();
      if (now < session.scheduledStart) {
        obj.status = 'upcoming';
      } else if (now >= session.scheduledStart && now <= session.scheduledEnd) {
        obj.status = 'ongoing';
      } else {
        obj.status = 'completed';
      }
      // Get active QR if any
      obj.activeQR = session.qrCodes.find(qr => qr.active && now < qr.expiresAt) || null;
      return obj;
    });

    res.json(sessionsWithStatus);
  } catch (e) {
    console.error('Get sessions error', e);
    res.status(500).json({ message: 'Failed to fetch sessions' });
  }
});

// GET /api/sessions/today - get today's sessions for teacher
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
      $or: [
        { scheduledStart: { $gte: startOfDay, $lte: endOfDay } },
        { scheduledEnd: { $gte: startOfDay, $lte: endOfDay } },
      ],
    })
      .populate('class', 'name code students')
      .populate('qrCodes.attendees.student', 'name email')
      .sort({ scheduledStart: 1 });

    const now = new Date();
    const sessionsWithStats = sessions.map((session) => {
      const obj = session.toObject();
      
      // Calculate status
      if (now < session.scheduledStart) {
        obj.status = 'upcoming';
      } else if (now >= session.scheduledStart && now <= session.scheduledEnd) {
        obj.status = 'ongoing';
      } else {
        obj.status = 'completed';
      }

      // Get attendance count from all QR codes
      const attendeeIds = new Set();
      session.qrCodes.forEach(qr => {
        qr.attendees.forEach(a => attendeeIds.add(a.student?.toString()));
      });
      obj.attendanceCount = attendeeIds.size;
      obj.totalStudents = session.class.students?.length || 0;
      
      // Get active QR if any
      obj.activeQR = session.qrCodes.find(qr => qr.active && now < qr.expiresAt) || null;
      
      return obj;
    });

    res.json(sessionsWithStats);
  } catch (e) {
    console.error('Get today sessions error', e);
    res.status(500).json({ message: 'Failed to fetch sessions' });
  }
});

// GET /api/sessions/active-qr - get currently active QR codes for teacher
router.get('/active-qr', auth('teacher'), async (req, res) => {
  try {
    const classes = await Class.find({ teacher: req.user.userId });
    const classIds = classes.map((c) => c._id);

    const now = new Date();
    const sessions = await Session.find({
      class: { $in: classIds },
      'qrCodes.active': true,
      'qrCodes.expiresAt': { $gt: now },
    })
      .populate('class', 'name code')
      .populate('qrCodes.attendees.student', 'name email');

    const activeQRs = [];
    sessions.forEach(session => {
      session.qrCodes.forEach(qr => {
        if (qr.active && now < qr.expiresAt) {
          activeQRs.push({
            sessionId: session._id,
            sessionTitle: session.title,
            class: session.class,
            qr: {
              _id: qr._id,
              token: qr.token,
              qrDataUrl: qr.qrDataUrl,
              createdAt: qr.createdAt,
              expiresAt: qr.expiresAt,
              attendees: qr.attendees,
              attendeeCount: qr.attendees.length,
            },
          });
        }
      });
    });

    res.json(activeQRs);
  } catch (e) {
    console.error('Get active QR error', e);
    res.status(500).json({ message: 'Failed to fetch active QR codes' });
  }
});

// GET /api/sessions/:id - get a specific session with details
router.get('/:id', auth('teacher'), async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('class', 'name code students teacher')
      .populate('qrCodes.attendees.student', 'name email');

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Verify teacher owns this class
    if (!session.class.teacher.equals(req.user.userId)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const now = new Date();
    const obj = session.toObject();
    
    if (now < session.scheduledStart) {
      obj.status = 'upcoming';
    } else if (now >= session.scheduledStart && now <= session.scheduledEnd) {
      obj.status = 'ongoing';
    } else {
      obj.status = 'completed';
    }

    obj.activeQR = session.qrCodes.find(qr => qr.active && now < qr.expiresAt) || null;

    res.json(obj);
  } catch (e) {
    console.error('Get session error', e);
    res.status(500).json({ message: 'Failed to fetch session' });
  }
});

// GET /api/sessions/:id/attendance - get attendance for a specific session
router.get('/:id/attendance', auth('teacher'), async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('class')
      .populate('qrCodes.attendees.student', 'name email studentId');

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Verify teacher owns this class
    if (!session.class.teacher.equals(req.user.userId)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Get all students in the class
    const classWithStudents = await Class.findById(session.class._id).populate('students', 'name email studentId');
    const enrolledStudents = classWithStudents.students || [];

    // Collect all attendees from all QR codes
    const attendanceMap = new Map();
    session.qrCodes.forEach(qr => {
      qr.attendees.forEach(a => {
        if (a.student && !attendanceMap.has(a.student._id.toString())) {
          attendanceMap.set(a.student._id.toString(), {
            student: a.student,
            markedAt: a.markedAt,
            qrToken: qr.token,
          });
        }
      });
    });

    // Build report
    const lateThreshold = new Date(session.scheduledStart.getTime() + 10 * 60 * 1000); // 10 min grace

    const report = enrolledStudents.map((student) => {
      const record = attendanceMap.get(student._id.toString());

      let status = 'Absent';
      let markedAt = null;

      if (record) {
        markedAt = record.markedAt;
        status = record.markedAt <= lateThreshold ? 'Present' : 'Late';
      }

      return {
        student: {
          _id: student._id,
          studentId: student.studentId,
          name: student.name,
          email: student.email,
        },
        status,
        markedAt,
      };
    });

    // Sort: Present first, then Late, then Absent
    const statusOrder = { 'Present': 0, 'Late': 1, 'Absent': 2 };
    report.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

    res.json({
      session: {
        _id: session._id,
        title: session.title,
        class: session.class,
        scheduledStart: session.scheduledStart,
        scheduledEnd: session.scheduledEnd,
      },
      attendance: report,
      stats: {
        total: enrolledStudents.length,
        present: report.filter((r) => r.status === 'Present').length,
        late: report.filter((r) => r.status === 'Late').length,
        absent: report.filter((r) => r.status === 'Absent').length,
      },
    });
  } catch (e) {
    console.error('Get session attendance error', e);
    res.status(500).json({ message: 'Failed to fetch attendance' });
  }
});

// POST /api/sessions - create a new session (without QR)
router.post('/', auth('teacher'), async (req, res) => {
  try {
    const { classId, title, scheduledStart, scheduledEnd } = req.body;

    if (!classId || !scheduledStart || !scheduledEnd) {
      return res.status(400).json({ message: 'Class, start time, and end time are required' });
    }

  const klass = await Class.findOne({ _id: classId, teacher: req.user.userId });
  if (!klass) {
    return res.status(404).json({ message: 'Class not found' });
  }

    const startTime = new Date(scheduledStart);
    const endTime = new Date(scheduledEnd);

    if (endTime <= startTime) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

  const session = await Session.create({
    class: klass._id,
      title: title || `${klass.name} Session`,
      scheduledStart: startTime,
      scheduledEnd: endTime,
      qrCodes: [],
    });

    const populatedSession = await Session.findById(session._id)
      .populate('class', 'name code students');

    res.status(201).json(populatedSession);
  } catch (e) {
    console.error('Create session error', e);
    res.status(500).json({ message: 'Failed to create session' });
  }
});

// POST /api/sessions/:id/generate-qr - generate QR code for an existing session
router.post('/:id/generate-qr', auth('teacher'), async (req, res) => {
  try {
    const { durationMinutes = 10 } = req.body;

    const session = await Session.findById(req.params.id).populate('class');
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Verify teacher owns this class
    if (!session.class.teacher.equals(req.user.userId)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const now = new Date();

    // Check if session has started
    if (now < session.scheduledStart) {
      return res.status(400).json({ 
        message: 'Cannot generate QR before session start time. Session starts at ' + 
                 session.scheduledStart.toLocaleString() 
      });
    }

    // Check if session has ended
    if (now > session.scheduledEnd) {
      return res.status(400).json({ message: 'Session has ended. Cannot generate QR.' });
    }

    // Deactivate any existing active QR codes for this session
    session.qrCodes.forEach(qr => {
      if (qr.active) {
        qr.active = false;
      }
    });

    // Generate new QR code
    const token = uuidv4();
    const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);
    
    // Make sure QR doesn't expire after session ends
    const actualExpiry = expiresAt > session.scheduledEnd ? session.scheduledEnd : expiresAt;

  const payload = JSON.stringify({ t: token });
  const qrDataUrl = await QRCode.toDataURL(payload);

    const newQR = {
      token,
      createdAt: now,
      expiresAt: actualExpiry,
      active: true,
      qrDataUrl,
      attendees: [],
    };

    session.qrCodes.push(newQR);
    await session.save();

    // Get the newly added QR
    const addedQR = session.qrCodes[session.qrCodes.length - 1];

  res.json({
    sessionId: session._id,
      qr: {
        _id: addedQR._id,
        token: addedQR.token,
        qrDataUrl: addedQR.qrDataUrl,
        createdAt: addedQR.createdAt,
        expiresAt: addedQR.expiresAt,
      },
      class: {
        _id: session.class._id,
        name: session.class.name,
        code: session.class.code,
      },
    });
  } catch (e) {
    console.error('Generate QR error', e);
    res.status(500).json({ message: 'Failed to generate QR code' });
  }
});

// PUT /api/sessions/:id/end-qr - deactivate current QR for a session
router.put('/:id/end-qr', auth('teacher'), async (req, res) => {
  try {
    const session = await Session.findById(req.params.id).populate('class');
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (!session.class.teacher.equals(req.user.userId)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Deactivate all active QR codes
    session.qrCodes.forEach(qr => {
      if (qr.active) {
        qr.active = false;
      }
    });
    await session.save();

    res.json({ message: 'QR code deactivated', session });
  } catch (e) {
    console.error('End QR error', e);
    res.status(500).json({ message: 'Failed to deactivate QR' });
  }
});

// DELETE /api/sessions/:id - delete a session
router.delete('/:id', auth('teacher'), async (req, res) => {
  try {
    const session = await Session.findById(req.params.id).populate('class');
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (!session.class.teacher.equals(req.user.userId)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Session.findByIdAndDelete(req.params.id);
    res.json({ message: 'Session deleted' });
  } catch (e) {
    console.error('Delete session error', e);
    res.status(500).json({ message: 'Failed to delete session' });
  }
});

module.exports = router;