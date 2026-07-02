// backend/routes/availability.js
const express = require('express');
const router = express.Router();
const Availability = require('../models/Availability');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role'); 

// Get availability settings (admin only)
router.get('/', async (req, res) => {
  try {
    let availability = await Availability.findOne();
    if (!availability) {
      // Create default settings if none exist
      availability = new Availability();
      await availability.save();
    }
    res.json(availability);
  } catch (err) {
    console.error('Get availability error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update availability settings (admin only)
router.put('/',auth,authorize('admin'), async (req, res) => {
  try {
    const { workingHours, blockedDates } = req.body;
    
    let availability = await Availability.findOne();
    if (!availability) {
      availability = new Availability();
    }

    if (workingHours) availability.workingHours = workingHours;
    if (blockedDates) availability.blockedDates = blockedDates;
    availability.updatedAt = new Date();

    await availability.save();
    res.json({ success: true, availability });
  } catch (err) {
    console.error('Update availability error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get bookings for a date range (for calendar)
router.get('/bookings/range', async (req, res) => {
  try {
    const { start, end } = req.query;
    const Booking = require('../models/Booking');
    
    const bookings = await Booking.find({
      date: { $gte: new Date(start), $lte: new Date(end) }
    }).sort({ date: 1, time: 1 });

    res.json(bookings);
  } catch (err) {
    console.error('Get bookings range error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;