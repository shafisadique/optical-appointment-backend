const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true 
  },
  description: { 
    type: String, 
    default: '' 
  },
  duration: { 
    type: Number, 
    required: true, 
    min: 1 
  },
  icon: { 
    type: String, 
    default: '📋' 
  },
  iconClass: { 
    type: String, 
    default: '' 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Update timestamp on save
serviceSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Service', serviceSchema);