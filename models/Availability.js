// backend/models/Availability.js
const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema({
  // Working hours for each day
  workingHours: {
    monday: { enabled: { type: Boolean, default: true }, start: { type: String, default: '09:00' }, end: { type: String, default: '18:00' } },
    tuesday: { enabled: { type: Boolean, default: true }, start: { type: String, default: '09:00' }, end: { type: String, default: '18:00' } },
    wednesday: { enabled: { type: Boolean, default: true }, start: { type: String, default: '09:00' }, end: { type: String, default: '18:00' } },
    thursday: { enabled: { type: Boolean, default: true }, start: { type: String, default: '09:00' }, end: { type: String, default: '18:00' } },
    friday: { enabled: { type: Boolean, default: true }, start: { type: String, default: '09:00' }, end: { type: String, default: '18:00' } },
    saturday: { enabled: { type: Boolean, default: false }, start: { type: String, default: '10:00' }, end: { type: String, default: '14:00' } },
    sunday: { enabled: { type: Boolean, default: false }, start: { type: String, default: '10:00' }, end: { type: String, default: '14:00' } }
  },
  // Blocked dates (holidays, off days)
  blockedDates: [{
    date: { type: Date, required: true },
    reason: { type: String, default: 'Blocked' }
  }],
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Availability', availabilitySchema);