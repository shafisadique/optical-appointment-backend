const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  date: { 
    type: String, 
    required: true, 
    unique: true,     // One entry per day (YYYY-MM-DD)
    default: () => new Date().toISOString().split('T')[0]
  },
  count: { 
    type: Number, 
    default: 0 
  },
  totalVisits: { 
    type: Number, 
    default: 0 
  }
}, { timestamps: true });

module.exports = mongoose.model('Visitor', visitorSchema);