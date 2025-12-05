const express = require('express');
const { Class, Session } = require('../models');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/classes - teacher's classes
router.get('/', auth('teacher'), async (req, res) => {
  try {
    const classes = await Class.find({ teacher: req.user.userId })
      .populate('students', 'name email');
    res.json(classes);
  } catch (e) {
    console.error('Get classes error', e);
    res.status(500).json({ message: 'Failed to fetch classes' });
  }
});

// GET /api/classes/enrolled - student's enrolled classes with session info
router.get('/enrolled', auth('student'), async (req, res) => {
  try {
    const studentId = req.user.userId;
    const classes = await Class.find({ students: studentId })
      .populate('teacher', 'name email');

    // Get session counts for each class
    const classesWithSessions = await Promise.all(
      classes.map(async (cls) => {
        const now = new Date();
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const todaySessions = await Session.countDocuments({
          class: cls._id,
          scheduledStart: { $gte: startOfDay, $lte: endOfDay },
        });

        const upcomingSessions = await Session.countDocuments({
          class: cls._id,
          scheduledStart: { $gt: now },
        });

        return {
          ...cls.toObject(),
          todaySessions,
          upcomingSessions,
        };
      })
    );

    res.json(classesWithSessions);
  } catch (e) {
    console.error('Get enrolled classes error', e);
    res.status(500).json({ message: 'Failed to fetch enrolled classes' });
  }
});

// GET /api/classes/sessions - get all sessions for student's enrolled classes
router.get('/sessions', auth('student'), async (req, res) => {
  try {
    const studentId = req.user.userId;
    const classes = await Class.find({ students: studentId });
    const classIds = classes.map((c) => c._id);

    const sessions = await Session.find({
      class: { $in: classIds },
    })
      .populate('class', 'name code')
      .sort({ scheduledStart: -1 });

    const now = new Date();
    const sessionsWithStatus = sessions.map((session) => {
      // Calculate status
      let status = 'upcoming';
      if (now < session.scheduledStart) {
        status = 'upcoming';
      } else if (now >= session.scheduledStart && now <= session.scheduledEnd) {
        status = 'ongoing';
      } else {
        status = 'completed';
      }

      // Check if student has marked attendance
      let attendanceStatus = null;
      let attendanceMarked = false;
      
      session.qrCodes.forEach(qr => {
        const attendance = qr.attendees.find(a => a.student?.equals(studentId));
        if (attendance) {
          attendanceMarked = true;
          const lateThreshold = new Date(session.scheduledStart.getTime() + 10 * 60 * 1000);
          attendanceStatus = attendance.markedAt <= lateThreshold ? 'Present' : 'Late';
        }
      });

      // Check if there's an active QR
      const activeQR = session.qrCodes.find(qr => qr.active && now < qr.expiresAt);

      return {
        _id: session._id,
        class: session.class,
        title: session.title,
        scheduledStart: session.scheduledStart,
        scheduledEnd: session.scheduledEnd,
        status,
        attendanceMarked,
        attendanceStatus,
        hasActiveQR: !!activeQR,
      };
    });

    res.json(sessionsWithStatus);
  } catch (e) {
    console.error('Get class sessions error', e);
    res.status(500).json({ message: 'Failed to fetch sessions' });
  }
});

// GET /api/classes/today - get today's sessions for student's enrolled classes
router.get('/today', auth('student'), async (req, res) => {
  try {
    const studentId = req.user.userId;
    const classes = await Class.find({ students: studentId });
    const classIds = classes.map((c) => c._id);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Get today's sessions for enrolled classes
    const sessions = await Session.find({
      class: { $in: classIds },
      $or: [
        { scheduledStart: { $gte: startOfDay, $lte: endOfDay } },
        { scheduledEnd: { $gte: startOfDay, $lte: endOfDay } },
      ],
    })
      .populate('class', 'name code')
      .sort({ scheduledStart: 1 });

    const now = new Date();
    const sessionsWithStatus = sessions.map((session) => {
      // Calculate status
      let status = 'Upcoming';
      if (now < session.scheduledStart) {
        status = 'Upcoming';
      } else if (now >= session.scheduledStart && now <= session.scheduledEnd) {
        status = 'Ongoing';
      } else {
        status = 'Completed';
      }

      // Check if student has marked attendance
      let attendanceMarked = false;
      session.qrCodes.forEach(qr => {
        if (qr.attendees.some(a => a.student?.equals(studentId))) {
          attendanceMarked = true;
          const lateThreshold = new Date(session.scheduledStart.getTime() + 10 * 60 * 1000);
          const attendance = qr.attendees.find(a => a.student?.equals(studentId));
          if (attendance) {
            status = attendance.markedAt <= lateThreshold ? 'Attended' : 'Late';
          }
        }
      });

      // Check if there's an active QR that student can use
      const activeQR = session.qrCodes.find(qr => qr.active && now < qr.expiresAt);
      if (activeQR && !attendanceMarked && status !== 'Completed') {
        status = 'Active';
      }

      // If session is completed and no attendance
      if (now > session.scheduledEnd && !attendanceMarked) {
        status = 'Missed';
      }

      return {
        _id: session._id,
        class: session.class,
        title: session.title,
        scheduledStart: session.scheduledStart,
        scheduledEnd: session.scheduledEnd,
        status,
        attendanceMarked,
        hasActiveQR: !!activeQR,
      };
    });

    res.json(sessionsWithStatus);
  } catch (e) {
    console.error('Get today classes error', e);
    res.status(500).json({ message: 'Failed to fetch today\'s classes' });
  }
});

// GET /api/classes/upcoming - get upcoming sessions for next 7 days (for calendar)
router.get('/upcoming', auth(), async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    let classIds = [];

    if (role === 'teacher') {
      const classes = await Class.find({ teacher: userId });
      classIds = classes.map((c) => c._id);
    } else if (role === 'student') {
      const classes = await Class.find({ students: userId });
      classIds = classes.map((c) => c._id);
    }

    const now = new Date();
    const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const sessions = await Session.find({
      class: { $in: classIds },
      scheduledStart: { $gte: now, $lte: weekLater },
    })
      .populate('class', 'name code')
      .sort({ scheduledStart: 1 });

    res.json(sessions);
  } catch (e) {
    console.error('Get upcoming sessions error', e);
    res.status(500).json({ message: 'Failed to fetch upcoming sessions' });
  }
});

// GET /api/classes/:id/sessions - get sessions for a specific class
router.get('/:id/sessions', auth(), async (req, res) => {
  try {
    const classId = req.params.id;
    const userId = req.user.userId;
    const role = req.user.role;

    const klass = await Class.findById(classId);
    if (!klass) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Verify access
    if (role === 'teacher' && !klass.teacher.equals(userId)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (role === 'student' && !klass.students.some(s => s.equals(userId))) {
      return res.status(403).json({ message: 'Not enrolled in this class' });
    }

    const sessions = await Session.find({ class: classId })
      .populate('class', 'name code')
      .sort({ scheduledStart: -1 });

    const now = new Date();
    const sessionsWithStatus = sessions.map((session) => {
      let status = 'upcoming';
      if (now < session.scheduledStart) {
        status = 'upcoming';
      } else if (now >= session.scheduledStart && now <= session.scheduledEnd) {
        status = 'ongoing';
      } else {
        status = 'completed';
      }

      const activeQR = session.qrCodes.find(qr => qr.active && now < qr.expiresAt);

      return {
        ...session.toObject(),
        status,
        activeQR: activeQR || null,
        attendeeCount: new Set(
          session.qrCodes.flatMap(qr => qr.attendees.map(a => a.student?.toString()))
        ).size,
      };
    });

    res.json(sessionsWithStatus);
  } catch (e) {
    console.error('Get class sessions error', e);
    res.status(500).json({ message: 'Failed to fetch sessions' });
  }
});

// POST /api/classes - teacher creates a new class with unique code
router.post('/', auth('teacher'), async (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name || !code) {
      return res.status(400).json({ message: 'Name and code are required' });
    }

    try {
      const klass = await Class.create({
        name,
        code: code.toUpperCase(),
        teacher: req.user.userId,
        students: [],
      });
      return res.status(201).json(klass);
    } catch (e) {
      if (e.code === 11000) {
        return res.status(409).json({ message: 'Class code already exists' });
      }
      throw e;
    }
  } catch (e) {
    console.error('Create class error', e);
    return res.status(500).json({ message: 'Failed to create class' });
  }
});

// POST /api/classes/join - student joins class by code
router.post('/join', auth('student'), async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: 'Class code is required' });
    }

    const klass = await Class.findOne({ code: code.toUpperCase() });
    if (!klass) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const studentId = req.user.userId;
    const alreadyIn = klass.students.some((s) => s.equals(studentId));
    if (alreadyIn) {
      return res.status(200).json({ message: 'Already enrolled in this class', class: klass });
    }

    klass.students.push(studentId);
    await klass.save();

    return res.status(200).json({ message: 'Joined class successfully', class: klass });
  } catch (e) {
    console.error('Join class error', e);
    return res.status(500).json({ message: 'Failed to join class' });
  }
});

// GET /api/classes/:id/register - get attendance register for a class (all students, all sessions)
router.get('/:id/register', auth('teacher'), async (req, res) => {
  try {
    const classId = req.params.id;

    const klass = await Class.findById(classId).populate('students', 'name email studentId');
    if (!klass) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Verify teacher owns this class
    if (!klass.teacher.equals(req.user.userId)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Get all completed sessions for this class (not upcoming)
    const sessions = await Session.find({ 
      class: classId,
    })
      .populate('qrCodes.attendees.student', 'name email studentId')
      .sort({ scheduledStart: 1 });

    // Filter to only completed or ongoing sessions
    const now = new Date();
    const relevantSessions = sessions.filter(s => now >= s.scheduledStart);

    // Build attendance matrix: for each student, count sessions attended
    const students = klass.students || [];
    const studentAttendance = students.map(student => {
      let sessionsAttended = 0;
      let sessionsLate = 0;
      const sessionDetails = [];

      relevantSessions.forEach(session => {
        const lateThreshold = new Date(session.scheduledStart.getTime() + 10 * 60 * 1000);
        let attended = false;
        let isLate = false;
        let markedAt = null;

        session.qrCodes.forEach(qr => {
          const attendance = qr.attendees.find(a => a.student?._id?.equals(student._id));
          if (attendance) {
            attended = true;
            markedAt = attendance.markedAt;
            if (attendance.markedAt > lateThreshold) {
              isLate = true;
            }
          }
        });

        if (attended) {
          if (isLate) {
            sessionsLate++;
          } else {
            sessionsAttended++;
          }
        }

        sessionDetails.push({
          sessionId: session._id,
          title: session.title,
          date: session.scheduledStart,
          status: attended ? (isLate ? 'Late' : 'Present') : 'Absent',
          markedAt,
        });
      });

      const totalSessions = relevantSessions.length;
      const attendancePercentage = totalSessions > 0 
        ? Math.round(((sessionsAttended + sessionsLate) / totalSessions) * 100) 
        : 0;

      return {
        student: {
          _id: student._id,
          studentId: student.studentId,
          name: student.name,
          email: student.email,
        },
        totalSessions,
        sessionsAttended,
        sessionsLate,
        sessionsAbsent: totalSessions - sessionsAttended - sessionsLate,
        attendancePercentage,
        sessionDetails,
      };
    });

    // Sort by attendance percentage (descending)
    studentAttendance.sort((a, b) => b.attendancePercentage - a.attendancePercentage);

    res.json({
      class: {
        _id: klass._id,
        name: klass.name,
        code: klass.code,
        totalStudents: students.length,
        totalSessions: relevantSessions.length,
      },
      sessions: relevantSessions.map(s => ({
        _id: s._id,
        title: s.title,
        date: s.scheduledStart,
      })),
      students: studentAttendance,
    });
  } catch (e) {
    console.error('Get class register error', e);
    res.status(500).json({ message: 'Failed to fetch attendance register' });
  }
});

module.exports = router;