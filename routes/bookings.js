const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role'); 

// Get all bookings (admin only)
router.get('/', async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ date: -1, time: 1 });
    res.json(bookings);
  } catch (err) {
    console.error('Get bookings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a single booking by ID (admin only)
router.get('/:id', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json(booking);
  } catch (err) {
    console.error('Get booking error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new booking (public)
router.post('/', auth,authorize('admin'),async (req, res) => {
  try {
    const { date, time, service, patient } = req.body;

    // Check if slot is already booked
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await Booking.findOne({
      date: { $gte: startOfDay, $lte: endOfDay },
      time: time
    });

    if (existing) {
      return res.status(409).json({
        error: 'This time slot is already booked. Please choose another time.'
      });
    }

    // Create booking
    const booking = new Booking({
      service,
      date: new Date(date),
      time,
      patient,
      status: 'pending'
    });

    await booking.save();

    res.status(201).json({
      success: true,
      bookingId: booking._id,
      message: 'Booking confirmed successfully!'
    });
  } catch (err) {
    console.error('Create booking error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ error: 'This time slot is already booked.' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Update booking status (admin only)
router.patch('/:id/status',auth,authorize('admin'), authorize('admin'),async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({ success: true, booking });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update booking notes (admin only)
router.patch('/:id/notes',auth, authorize('admin'),async (req, res) => {
  try {
    const { notes } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { notes },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({ success: true, booking });
  } catch (err) {
    console.error('Update notes error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete booking (admin only)
router.delete('/:id',auth,authorize('admin'), async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json({ success: true, message: 'Booking deleted' });
  } catch (err) {
    console.error('Delete booking error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;