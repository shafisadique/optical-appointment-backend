const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema({
  dailyLimit: {
    type: Number,
    default: 20,
    min: 5,
    max: 50
  },
  blockedDates: [{
    date: { type: Date, required: true },
    reason: { type: String, default: 'Holiday / Closed' }
  }],
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Availability', availabilitySchema);