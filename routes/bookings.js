const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Availability = require('../models/Availability');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');

// ====================== PUBLIC: Create Booking ======================
router.post('/', async (req, res) => {
  try {
    const { date, service, patient } = req.body;

    if (!date || !service || !patient?.name || !patient?.phone || !patient?.email) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const bookingDate = new Date(date);
    bookingDate.setHours(0, 0, 0, 0);

    // Daily limit check
    let availability = await Availability.findOne();
    const DAILY_LIMIT = availability?.dailyLimit || 20;

    const count = await Booking.countDocuments({
      date: bookingDate,
      status: { $nin: ['cancelled', 'completed'] }
    });

    if (count >= DAILY_LIMIT) {
      return res.status(400).json({ 
        success: false, 
        message: `Only ${DAILY_LIMIT} appointments available for this day.` 
      });
    }

    // Duplicate check
    const existing = await Booking.findOne({
      'patient.email': patient.email.toLowerCase().trim(),
      date: { $gte: new Date() },
      status: { $nin: ['cancelled', 'completed'] }
    });

    if (existing) {
      return res.status(409).json({ 
        success: false, 
        message: 'You already have an active appointment.' 
      });
    }

    const bookingId = `HD-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(Math.floor(10000 + Math.random() * 90000))}`;

    const booking = new Booking({
      bookingId,
      service: { _id: service._id, name: service.name },
      date: bookingDate,
      patient: {
        name: patient.name.trim(),
        phone: patient.phone,
        email: patient.email.toLowerCase().trim(),
        message: patient.message || ''
      },
      status: 'pending'
    });

    await booking.save();

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully!',
      bookingId: booking.bookingId,
      booking
    });

  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ====================== ADMIN ROUTES ======================

// Get All Bookings
router.get('/', auth, authorize('admin'), async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ date: -1, createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get Single Booking
router.get('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update Status + WhatsApp Web Link
router.patch('/:id/status', auth, authorize('admin'), async (req, res) => {
  try {
    const { status, cancellationReason } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    booking.status = status;
    if (cancellationReason) booking.cancellationReason = cancellationReason;
    if (status === 'confirmed') booking.confirmedAt = new Date();

    await booking.save();

    let whatsappLink = null;
    if (status === 'confirmed') {
      whatsappLink = getWhatsAppLink(booking);
    }

    res.json({ 
      success: true, 
      booking,
      whatsappLink 
    });

  } catch (err) {
    console.error('Status update error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Reschedule + WhatsApp Web Link
router.patch('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { date } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    booking.date = new Date(date);
    booking.status = 'rescheduled';

    await booking.save();

    const whatsappLink = getWhatsAppLink(booking, true); // isReschedule = true

    res.json({
      success: true,
      booking,
      whatsappLink
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update Notes
router.patch('/:id/notes', auth, authorize('admin'), async (req, res) => {
  try {
    const { notes } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    booking.notes = notes;
    await booking.save();
    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete Booking
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json({ success: true, message: 'Booking deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ====================== HELPER - WhatsApp Web Link ======================
function getWhatsAppLink(booking, isReschedule = false) {
  let message = '';

  if (isReschedule) {
    message = `Hello ${booking.patient.name},%0A%0A` +
              `Your appointment has been *rescheduled*.%0A%0A` +
              `Booking ID: ${booking.bookingId}%0A` +
              `New Date: ${booking.date.toLocaleDateString('en-IN')}%0A` +
              `Service: ${booking.service.name}%0A%0A` +
              `Haider Dental Care`;
  } else {
    message = `Hello ${booking.patient.name},%0A%0A` +
              `Your appointment has been *confirmed*.%0A%0A` +
              `Booking ID: ${booking.bookingId}%0A` +
              `Date: ${booking.date.toLocaleDateString('en-IN')}%0A` +
              `Service: ${booking.service.name}%0A%0A` +
              `Please arrive 10 minutes early.%0A%0A` +
              `Haider Dental Care`;
  }

  // Clean phone number
  let phone = booking.patient.phone.replace(/\D/g, '');
  if (phone.length === 10) phone = '91' + phone;

  return `https://wa.me/${phone}?text=${message}`;
}

module.exports = router;