const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

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

module.exports = mongoose.model('Session', sessionSchema);


