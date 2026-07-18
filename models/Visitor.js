const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  date: { 
    type: String, 
    required: true, 
    unique: true 
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