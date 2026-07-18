const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  service: {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    name: {
      type: String,
      required: true
    }
  },

  date: {
    type: Date,
    required: true
  },

  patient: {
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    message: {
      type: String,
      default: ''
    }
  },

  status: {
    type: String,
    enum: [
      'pending',
      'confirmed',
      'completed',
      'cancelled',
      'rescheduled'
    ],
    default: 'pending'
  },

  notes: {
    type: String,
    default: ''
  },

  adminNotes: {
    type: String,
    default: ''
  },

  originalDate: Date,

  rescheduledAt: Date

}, {
  timestamps: true
});

bookingSchema.index({ date: 1 });
bookingSchema.index({ 'patient.email': 1, date: 1 });

module.exports = mongoose.model('Booking', bookingSchema);