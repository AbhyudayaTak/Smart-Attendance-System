const express = require('express');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await user.validatePassword(password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const token = jwt.sign(
    { userId: user._id, role: user.role, name: user.name, studentId: user.studentId },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
  res.json({ token, role: user.role, name: user.name, studentId: user.studentId });
});

// POST /api/auth/signup - public signup, always creates a student
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, studentId } = req.body;
    if (!name || !email || !password || !studentId) {
      return res.status(400).json({ message: 'Name, email, password and Student ID are required' });
    }

    // Validate studentId format (e.g., 2023UCP1665)
    if (!/^[0-9]{4}[A-Z]{2,4}[0-9]{3,5}$/i.test(studentId)) {
      return res.status(400).json({ message: 'Invalid Student ID format (e.g., 2023UCP1665)' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const existingStudentId = await User.findOne({ studentId: studentId.toUpperCase() });
    if (existingStudentId) {
      return res.status(409).json({ message: 'Student ID already registered' });
    }

    const user = new User({
      name,
      email,
      studentId: studentId.toUpperCase(),
      role: 'student', // default for all signups
    });
    await user.setPassword(password);
    await user.save();

    const token = jwt.sign(
      { userId: user._id, role: user.role, name: user.name, studentId: user.studentId },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.status(201).json({ token, role: user.role, name: user.name, studentId: user.studentId });
  } catch (e) {
    console.error('Signup error', e);
    return res.status(500).json({ message: 'Failed to sign up' });
  }
});

module.exports = router;


