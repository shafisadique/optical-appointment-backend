const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  service: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    duration: { type: Number, required: true },
    icon: { type: String },
    iconClass: { type: String }
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  patient: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String, default: '' }
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    default: 'pending'
  },
  notes: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  cancellationReason: {
  type: String,
  default: ''
},

isDeleted: {
  type: Boolean,
  default: false
},

deletedAt: {
  type: Date,
  default: null
},

adminNotes: {
  type: String,
  default: ''
}
});

// Ensure no duplicate booking for same date & time
bookingSchema.index({ date: 1, time: 1 }, { unique: true });

module.exports = mongoose.model('Booking', bookingSchema);