const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  studentId: { type: String, unique: true, sparse: true }, // e.g., 2023UCP1665 - only for students
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['student', 'teacher', 'admin'], required: true },
  department: { type: String }, // e.g., 'Computer Science', 'Mathematics', 'Physics', 'Engineering'
});

userSchema.methods.setPassword = async function (password) {
  this.passwordHash = await bcrypt.hash(password, 10);
};

userSchema.methods.validatePassword = async function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

const classSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true }, // human-readable class code
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  department: { type: String }, // e.g., 'Computer Science', 'Mathematics', 'Physics', 'Engineering'
});

// Schema for each QR code generated within a session
const qrCodeSchema = new mongoose.Schema({
  token: { type: String, default: uuidv4, unique: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  active: { type: Boolean, default: true },
  qrDataUrl: { type: String }, // Store the QR image data URL
  attendees: [{ 
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    markedAt: { type: Date, default: Date.now }
  }],
});

const sessionSchema = new mongoose.Schema({
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  title: { type: String }, // Session title/topic
  scheduledStart: { type: Date, required: true }, // When the session starts
  scheduledEnd: { type: Date, required: true }, // When the session ends
  createdAt: { type: Date, default: Date.now },
  qrCodes: [qrCodeSchema], // Array of QR codes generated for this session
  status: { 
    type: String, 
    enum: ['upcoming', 'ongoing', 'completed'], 
    default: 'upcoming' 
  },
});

// Virtual to check current status based on time
sessionSchema.methods.getCurrentStatus = function() {
  const now = new Date();
  if (now < this.scheduledStart) return 'upcoming';
  if (now >= this.scheduledStart && now <= this.scheduledEnd) return 'ongoing';
  return 'completed';
};

// Get active QR code for this session
sessionSchema.methods.getActiveQR = function() {
  const now = new Date();
  return this.qrCodes.find(qr => qr.active && now < qr.expiresAt);
};

const attendanceSchema = new mongoose.Schema({
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  markedAt: { type: Date, default: Date.now },
});

attendanceSchema.index({ session: 1, student: 1 }, { unique: true }); // prevent duplicates

const User = mongoose.model('User', userSchema);
const Class = mongoose.model('Class', classSchema);
const Session = mongoose.model('Session', sessionSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = { User, Class, Session, Attendance };
