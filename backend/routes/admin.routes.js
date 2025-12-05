const express = require('express');
const { User, Class, Session, Attendance } = require('../models');
const { auth } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

const router = express.Router();

// All routes require admin authentication
router.use(auth('admin'));

// GET /api/admin/stats - get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalTeachers = await User.countDocuments({ role: 'teacher' });
    const activeClasses = await Class.countDocuments({});

    // Calculate overall attendance percentage
    const sessions = await Session.find({})
      .populate('class')
      .populate('qrCodes.attendees.student');

    let totalSessions = 0;
    let totalAttendances = 0;
    const studentAttendanceMap = new Map();

    sessions.forEach(session => {
      if (session.class && session.class.students) {
        const enrolledCount = session.class.students.length;
        totalSessions += enrolledCount;

        // Count attendances from all QR codes
        session.qrCodes.forEach(qr => {
          qr.attendees.forEach(attendee => {
            if (attendee.student) {
              const studentId = attendee.student._id.toString();
              if (!studentAttendanceMap.has(studentId)) {
                studentAttendanceMap.set(studentId, new Set());
              }
              studentAttendanceMap.get(studentId).add(session._id.toString());
            }
          });
        });
      }
    });

    // Count total attendances
    studentAttendanceMap.forEach((sessionSet) => {
      totalAttendances += sessionSet.size;
    });

    const overallAttendance = totalSessions > 0 
      ? Math.round((totalAttendances / totalSessions) * 100) 
      : 0;

    res.json({
      totalStudents,
      totalTeachers,
      overallAttendance,
      activeClasses,
    });
  } catch (e) {
    console.error('Get admin stats error', e);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
});

// GET /api/admin/departments - get departments overview
router.get('/departments', async (req, res) => {
  try {
    // Get all unique departments from users and classes
    const users = await User.find({ department: { $exists: true, $ne: null } });
    const classes = await Class.find({ department: { $exists: true, $ne: null } });
    
    const departmentSet = new Set();
    users.forEach(u => { if (u.department) departmentSet.add(u.department); });
    classes.forEach(c => { if (c.department) departmentSet.add(c.department); });

    const departments = Array.from(departmentSet);

    // Get stats for each department
    const departmentsWithStats = await Promise.all(
      departments.map(async (deptName) => {
        const students = await User.countDocuments({ role: 'student', department: deptName });
        const teachers = await User.countDocuments({ role: 'teacher', department: deptName });
        
        // Calculate attendance for this department
        const deptClasses = await Class.find({ department: deptName }).populate('students');
        const classIds = deptClasses.map(c => c._id);
        
        const deptSessions = await Session.find({ class: { $in: classIds } })
          .populate('qrCodes.attendees.student');

        let deptTotalSessions = 0;
        let deptTotalAttendances = 0;
        const deptStudentAttendanceMap = new Map();

        deptClasses.forEach(cls => {
          if (cls.students) {
            deptTotalSessions += cls.students.length;
          }
        });

        deptSessions.forEach(session => {
          session.qrCodes.forEach(qr => {
            qr.attendees.forEach(attendee => {
              if (attendee.student) {
                const studentId = attendee.student._id.toString();
                if (!deptStudentAttendanceMap.has(studentId)) {
                  deptStudentAttendanceMap.set(studentId, new Set());
                }
                deptStudentAttendanceMap.get(studentId).add(session._id.toString());
              }
            });
          });
        });

        deptStudentAttendanceMap.forEach((sessionSet) => {
          deptTotalAttendances += sessionSet.size;
        });

        const attendance = deptTotalSessions > 0
          ? Math.round((deptTotalAttendances / deptTotalSessions) * 100)
          : 0;

        return {
          name: deptName,
          students,
          teachers,
          attendance,
        };
      })
    );

    res.json(departmentsWithStats);
  } catch (e) {
    console.error('Get departments error', e);
    res.status(500).json({ message: 'Failed to fetch departments' });
  }
});

// GET /api/admin/users - get all users with optional search
router.get('/users', async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      // Search by name, email, or studentId
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { studentId: { $regex: search, $options: 'i' } },
        ],
      };
    }

    const users = await User.find(query)
      .select('-passwordHash')
      .sort({ name: 1 });

    res.json(users);
  } catch (e) {
    console.error('Get users error', e);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// GET /api/admin/users/:id - get a specific user
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (e) {
    console.error('Get user error', e);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

// POST /api/admin/users - create a new user
router.post('/users', async (req, res) => {
  try {
    const { name, email, studentId, role, department, password } = req.body;

    if (!name || !email || !role || !password) {
      return res.status(400).json({ message: 'Name, email, role, and password are required' });
    }

    // Validate studentId if provided for students
    if (role === 'student' && !studentId) {
      return res.status(400).json({ message: 'Student ID is required for students' });
    }

    if (studentId && !/^[0-9]{4}[A-Z]{2,4}[0-9]{3,5}$/i.test(studentId)) {
      return res.status(400).json({ message: 'Invalid Student ID format (e.g., 2023UCP1665)' });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    // Check if studentId already exists
    if (studentId) {
      const existingStudentId = await User.findOne({ studentId: studentId.toUpperCase() });
      if (existingStudentId) {
        return res.status(409).json({ message: 'Student ID already in use' });
      }
    }

    const user = new User({
      name,
      email,
      role,
      department: department || null,
      studentId: role === 'student' && studentId ? studentId.toUpperCase() : null,
    });

    await user.setPassword(password);
    await user.save();

    const newUser = await User.findById(user._id).select('-passwordHash');
    res.status(201).json(newUser);
  } catch (e) {
    console.error('Create user error', e);
    res.status(500).json({ message: 'Failed to create user' });
  }
});

// PUT /api/admin/users/:id - update a user
router.put('/users/:id', async (req, res) => {
  try {
    const { name, email, studentId, role, department } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate role change: only student -> teacher allowed
    if (role && role !== user.role) {
      if (user.role !== 'student' || role !== 'teacher') {
        return res.status(400).json({ 
          message: 'Role change not allowed. Only students can be promoted to teachers.' 
        });
      }
    }

    // Update fields
    if (name !== undefined) user.name = name;
    if (email !== undefined) {
      // Check if email is already taken by another user
      const existing = await User.findOne({ email, _id: { $ne: user._id } });
      if (existing) {
        return res.status(409).json({ message: 'Email already in use' });
      }
      user.email = email;
    }
    if (studentId !== undefined) {
      // Check if studentId is already taken by another user
      if (studentId) {
        const existing = await User.findOne({ studentId, _id: { $ne: user._id } });
        if (existing) {
          return res.status(409).json({ message: 'Student ID already in use' });
        }
        user.studentId = studentId.toUpperCase();
      } else {
        user.studentId = undefined;
      }
    }
    if (role !== undefined) user.role = role;
    if (department !== undefined) user.department = department;

    await user.save();

    const updatedUser = await User.findById(user._id).select('-passwordHash');
    res.json(updatedUser);
  } catch (e) {
    console.error('Update user error', e);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// DELETE /api/admin/users/:id - delete a user
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting yourself
    if (user._id.equals(req.user.userId)) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // Remove user from classes
    await Class.updateMany(
      { teacher: user._id },
      { $unset: { teacher: '' } }
    );
    await Class.updateMany(
      { students: user._id },
      { $pull: { students: user._id } }
    );

    await User.findByIdAndDelete(user._id);
    res.json({ message: 'User deleted successfully' });
  } catch (e) {
    console.error('Delete user error', e);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// GET /api/admin/classes - get all classes
router.get('/classes', async (req, res) => {
  try {
    const classes = await Class.find({})
      .populate('teacher', 'name email department')
      .populate('students', 'name email studentId department')
      .sort({ createdAt: -1 });

    res.json(classes);
  } catch (e) {
    console.error('Get classes error', e);
    res.status(500).json({ message: 'Failed to fetch classes' });
  }
});

// GET /api/admin/reports - get attendance reports
router.get('/reports', async (req, res) => {
  try {
    const { startDate, endDate, department, classId } = req.query;

    // Build query
    const sessionQuery = {};
    if (startDate || endDate) {
      sessionQuery.scheduledStart = {};
      if (startDate) sessionQuery.scheduledStart.$gte = new Date(startDate);
      if (endDate) sessionQuery.scheduledStart.$lte = new Date(endDate);
    }

    let classIds = [];
    if (classId) {
      classIds = [classId];
    } else if (department) {
      const classes = await Class.find({ department });
      classIds = classes.map(c => c._id);
    }

    if (classIds.length > 0) {
      sessionQuery.class = { $in: classIds };
    }

    const sessions = await Session.find(sessionQuery)
      .populate('class', 'name code department')
      .populate('qrCodes.attendees.student', 'name email studentId department')
      .sort({ scheduledStart: -1 });

    // Build report
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
              student: {
                _id: attendee.student._id,
                name: attendee.student.name,
                email: attendee.student.email,
                studentId: attendee.student.studentId,
                department: attendee.student.department,
              },
              class: {
                _id: session.class._id,
                name: session.class.name,
                code: session.class.code,
                department: session.class.department,
              },
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

    report.sort((a, b) => new Date(b.markedAt) - new Date(a.markedAt));

    res.json(report);
  } catch (e) {
    console.error('Get reports error', e);
    res.status(500).json({ message: 'Failed to fetch reports' });
  }
});

// GET /api/admin/recent-activity - get recent attendance activity
router.get('/recent-activity', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const sessions = await Session.find({})
      .populate('class', 'name code')
      .populate('qrCodes.attendees.student', 'name email studentId')
      .sort({ createdAt: -1 })
      .limit(50);

    const activity = [];
    sessions.forEach(session => {
      // Skip if session doesn't have required fields
      if (!session.scheduledStart || !session.class) {
        return;
      }

      const lateThreshold = new Date(session.scheduledStart.getTime() + 10 * 60 * 1000);
      
      // Check if qrCodes exists and is an array
      if (!session.qrCodes || !Array.isArray(session.qrCodes)) {
        return;
      }

      session.qrCodes.forEach(qr => {
        // Check if attendees exists and is an array
        if (!qr.attendees || !Array.isArray(qr.attendees)) {
          return;
        }

        qr.attendees.forEach(attendee => {
          if (attendee.student && attendee.markedAt) {
            let status = 'Present';
            if (attendee.markedAt > lateThreshold) {
              status = 'Late';
            }

            activity.push({
              _id: `${session._id}-${attendee.student._id}`,
              student: {
                _id: attendee.student._id,
                name: attendee.student.name,
                email: attendee.student.email,
                studentId: attendee.student.studentId,
              },
              class: {
                _id: session.class._id,
                name: session.class.name,
                code: session.class.code,
              },
              date: session.scheduledStart,
              markedAt: attendee.markedAt,
              status,
            });
          }
        });
      });
    });

    // Sort by markedAt (newest first) and limit
    activity.sort((a, b) => new Date(b.markedAt) - new Date(a.markedAt));
    res.json(activity.slice(0, limit));
  } catch (e) {
    console.error('Get recent activity error', e);
    res.status(500).json({ message: 'Failed to fetch recent activity' });
  }
});

// GET /api/admin/reports/class-wise - get class-wise attendance statistics
router.get('/reports/class-wise', async (req, res) => {
  try {
    const classes = await Class.find({})
      .populate('teacher', 'name email department')
      .populate('students', 'name email studentId department')
      .sort({ code: 1 });

    const now = new Date();
    const classStats = await Promise.all(
      classes.map(async (klass) => {
        // Get all sessions for this class
        const sessions = await Session.find({ class: klass._id })
          .populate('qrCodes.attendees.student', 'name email studentId');

        // Filter to only completed or ongoing sessions
        const relevantSessions = sessions.filter(s => now >= s.scheduledStart);

        // Calculate attendance statistics
        const totalStudents = klass.students?.length || 0;
        const totalSessions = relevantSessions.length;
        
        let totalPossibleAttendances = totalStudents * totalSessions;
        let totalAttendances = 0;
        let totalPresent = 0;
        let totalLate = 0;

        const studentAttendanceMap = new Map();
        relevantSessions.forEach(session => {
          const lateThreshold = new Date(session.scheduledStart.getTime() + 10 * 60 * 1000);
          
          session.qrCodes.forEach(qr => {
            qr.attendees.forEach(attendee => {
              if (attendee.student) {
                const studentId = attendee.student._id.toString();
                if (!studentAttendanceMap.has(studentId)) {
                  studentAttendanceMap.set(studentId, { present: 0, late: 0 });
                }
                const stats = studentAttendanceMap.get(studentId);
                if (attendee.markedAt <= lateThreshold) {
                  stats.present++;
                  totalPresent++;
                } else {
                  stats.late++;
                  totalLate++;
                }
                totalAttendances++;
              }
            });
          });
        });

        const attendancePercentage = totalPossibleAttendances > 0
          ? Math.round((totalAttendances / totalPossibleAttendances) * 100)
          : 0;

        return {
          class: {
            _id: klass._id,
            name: klass.name,
            code: klass.code,
            department: klass.department,
            teacher: klass.teacher,
          },
          statistics: {
            totalStudents,
            totalSessions,
            totalPossibleAttendances,
            totalAttendances,
            totalPresent,
            totalLate,
            totalAbsent: totalPossibleAttendances - totalAttendances,
            attendancePercentage,
          },
        };
      })
    );

    res.json(classStats);
  } catch (e) {
    console.error('Get class-wise attendance error', e);
    res.status(500).json({ message: 'Failed to fetch class-wise attendance' });
  }
});

// GET /api/admin/reports/students-attendance - get all students with their attendance across all classes
router.get('/reports/students-attendance', async (req, res) => {
  try {
    const students = await User.find({ role: 'student' })
      .select('-passwordHash')
      .sort({ name: 1 });

    const now = new Date();
    const studentStats = await Promise.all(
      students.map(async (student) => {
        // Get all classes this student is enrolled in
        const classes = await Class.find({ students: student._id })
          .populate('teacher', 'name email');

        // Get all sessions for these classes
        const classIds = classes.map(c => c._id);
        const sessions = await Session.find({ class: { $in: classIds } })
          .populate('class', 'name code')
          .populate('qrCodes.attendees.student', 'name email studentId');

        // Filter to only completed or ongoing sessions
        const relevantSessions = sessions.filter(s => now >= s.scheduledStart);

        // Calculate attendance per class
        const classAttendance = [];
        let totalSessions = 0;
        let totalPresent = 0;
        let totalLate = 0;
        let totalAbsent = 0;

        classes.forEach(klass => {
          const classSessions = relevantSessions.filter(s => s.class._id.equals(klass._id));
          const classTotalSessions = classSessions.length;
          totalSessions += classTotalSessions;

          let classPresent = 0;
          let classLate = 0;
          let classAbsent = classTotalSessions;

          classSessions.forEach(session => {
            const lateThreshold = new Date(session.scheduledStart.getTime() + 10 * 60 * 1000);
            let attended = false;

            session.qrCodes.forEach(qr => {
              const attendance = qr.attendees.find(a => a.student?._id?.equals(student._id));
              if (attendance) {
                attended = true;
                if (attendance.markedAt <= lateThreshold) {
                  classPresent++;
                  totalPresent++;
                } else {
                  classLate++;
                  totalLate++;
                }
                classAbsent--;
                totalAbsent--;
              }
            });
          });

          const classAttendancePercentage = classTotalSessions > 0
            ? Math.round(((classPresent + classLate) / classTotalSessions) * 100)
            : 0;

          classAttendance.push({
            class: {
              _id: klass._id,
              name: klass.name,
              code: klass.code,
              teacher: klass.teacher,
            },
            totalSessions: classTotalSessions,
            present: classPresent,
            late: classLate,
            absent: classAbsent,
            attendancePercentage: classAttendancePercentage,
          });
        });

        const overallAttendancePercentage = totalSessions > 0
          ? Math.round(((totalPresent + totalLate) / totalSessions) * 100)
          : 0;

        return {
          student: {
            _id: student._id,
            name: student.name,
            email: student.email,
            studentId: student.studentId,
            department: student.department,
          },
          classes: classAttendance,
          overall: {
            totalSessions,
            present: totalPresent,
            late: totalLate,
            absent: totalAbsent,
            attendancePercentage: overallAttendancePercentage,
          },
        };
      })
    );

    res.json(studentStats);
  } catch (e) {
    console.error('Get students attendance error', e);
    res.status(500).json({ message: 'Failed to fetch students attendance' });
  }
});

// GET /api/admin/reports/teachers - get all teachers with their class statistics
router.get('/reports/teachers', async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher' })
      .select('-passwordHash')
      .sort({ name: 1 });

    const now = new Date();
    const teacherStats = await Promise.all(
      teachers.map(async (teacher) => {
        // Get all classes taught by this teacher
        const classes = await Class.find({ teacher: teacher._id })
          .populate('students', 'name email studentId');

        // Get all sessions for these classes
        const classIds = classes.map(c => c._id);
        const sessions = await Session.find({ class: { $in: classIds } })
          .populate('class', 'name code')
          .populate('qrCodes.attendees.student', 'name email studentId');

        // Filter to only completed or ongoing sessions
        const relevantSessions = sessions.filter(s => now >= s.scheduledStart);

        // Calculate statistics
        const totalStudents = classes.reduce((sum, c) => sum + (c.students?.length || 0), 0);
        const totalSessions = relevantSessions.length;
        
        let totalPossibleAttendances = 0;
        let totalAttendances = 0;
        let totalPresent = 0;
        let totalLate = 0;

        classes.forEach(klass => {
          const classSessions = relevantSessions.filter(s => s.class._id.equals(klass._id));
          const classStudents = klass.students?.length || 0;
          totalPossibleAttendances += classStudents * classSessions.length;
        });

        relevantSessions.forEach(session => {
          const lateThreshold = new Date(session.scheduledStart.getTime() + 10 * 60 * 1000);
          
          session.qrCodes.forEach(qr => {
            qr.attendees.forEach(attendee => {
              if (attendee.student) {
                totalAttendances++;
                if (attendee.markedAt <= lateThreshold) {
                  totalPresent++;
                } else {
                  totalLate++;
                }
              }
            });
          });
        });

        const attendancePercentage = totalPossibleAttendances > 0
          ? Math.round((totalAttendances / totalPossibleAttendances) * 100)
          : 0;

        return {
          teacher: {
            _id: teacher._id,
            name: teacher.name,
            email: teacher.email,
            department: teacher.department,
          },
          statistics: {
            totalClasses: classes.length,
            totalStudents,
            totalSessions,
            totalPossibleAttendances,
            totalAttendances,
            totalPresent,
            totalLate,
            totalAbsent: totalPossibleAttendances - totalAttendances,
            attendancePercentage,
          },
          classes: classes.map(c => ({
            _id: c._id,
            name: c.name,
            code: c.code,
            studentCount: c.students?.length || 0,
          })),
        };
      })
    );

    res.json(teacherStats);
  } catch (e) {
    console.error('Get teachers report error', e);
    res.status(500).json({ message: 'Failed to fetch teachers report' });
  }
});

// DELETE /api/admin/attendance/clear - clear all attendance records
router.delete('/attendance/clear', async (req, res) => {
  try {
    // Clear attendees from all QR codes in all sessions
    const sessions = await Session.find({});
    
    for (const session of sessions) {
      // Clear attendees from all QR codes
      session.qrCodes.forEach(qr => {
        qr.attendees = [];
      });
      session.markModified('qrCodes');
      await session.save();
    }

    // Also clear the Attendance collection if it exists
    await Attendance.deleteMany({});

    res.json({ 
      message: 'All attendance records have been cleared successfully',
      sessionsCleared: sessions.length
    });
  } catch (e) {
    console.error('Clear attendance error', e);
    res.status(500).json({ message: 'Failed to clear attendance records' });
  }
});

// POST /api/admin/seed - demo seed endpoint (keep for testing)
router.post('/seed', async (req, res) => {
  const existingAdmin = await User.findOne({ email: 'admin@example.com' });
  if (existingAdmin) {
    return res.json({ message: 'Already seeded' });
  }

  const admin = new User({ name: 'Admin', email: 'admin@example.com', role: 'admin', department: 'Administration' });
  await admin.setPassword('admin123');
  await admin.save();

  const teacher = new User({
    name: 'Teacher',
    email: 'teacher@example.com',
    role: 'teacher',
    department: 'Computer Science',
  });
  await teacher.setPassword('teacher123');
  await teacher.save();

  const student = new User({
    name: 'Student',
    email: 'student@example.com',
    role: 'student',
    studentId: '2023UCP0001',
    department: 'Computer Science',
  });
  await student.setPassword('student123');
  await student.save();

  const klass = new Class({
    name: 'Sample Class',
    code: 'CSE101',
    teacher: teacher._id,
    students: [student._id],
    department: 'Computer Science',
  });
  await klass.save();

  res.json({
    message: 'Seeded',
    users: {
      admin: { email: 'admin@example.com', password: 'admin123' },
      teacher: { email: 'teacher@example.com', password: 'teacher123' },
      student: { email: 'student@example.com', password: 'student123' },
    },
  });
});

module.exports = router;
