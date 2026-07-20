const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Availability = require('../models/Availability');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');

const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// PDF Directory
const pdfDir = path.join(__dirname, '../public/pdfs');
if (!fs.existsSync(pdfDir)) {
  fs.mkdirSync(pdfDir, { recursive: true });
}

// Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

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
      return res.status(400).json({ success: false, message: `Only ${DAILY_LIMIT} appointments available for this day.` });
    }

    // Duplicate check
    const existing = await Booking.findOne({
      'patient.email': patient.email.toLowerCase().trim(),
      date: { $gte: new Date() },
      status: { $nin: ['cancelled', 'completed'] }
    });

    if (existing) {
      return res.status(409).json({ success: false, message: 'You already have an active appointment.' });
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

    // Generate PDF & Send Email
    const pdfPath = await generateBookingPDF(booking);
    await sendBookingEmail(booking, pdfPath);

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

// ====================== PDF & EMAIL HELPERS ======================
async function generateBookingPDF(booking) {
  return new Promise((resolve, reject) => {
    const pdfPath = path.join(pdfDir, `${booking.bookingId}.pdf`);
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(pdfPath);

    doc.pipe(stream);

    doc.fontSize(20).text('Haider Dental Care', { align: 'center' });
    doc.fontSize(16).text('Appointment Confirmation', { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(12);
    doc.text(`Booking ID: ${booking.bookingId}`);
    doc.text(`Date: ${booking.date.toLocaleDateString('en-IN')}`);
    doc.text(`Service: ${booking.service.name}`);
    doc.moveDown();

    doc.text(`Patient: ${booking.patient.name}`);
    doc.text(`Phone: ${booking.patient.phone}`);
    doc.text(`Email: ${booking.patient.email}`);

    doc.moveDown();
    doc.text('Status: Pending', { color: 'orange' });

    doc.end();
    stream.on('finish', () => resolve(pdfPath));
    stream.on('error', reject);
  });
}

async function sendBookingEmail(booking, pdfPath) {
  const mailOptions = {
    from: `"Haider Dental Care" <${process.env.EMAIL_USER}>`,
    to: booking.patient.email,
    subject: `Appointment Confirmation - ${booking.bookingId}`,
    html: `<h2>Thank you ${booking.patient.name}!</h2><p>Your appointment is booked.</p>`,
    attachments: [{ filename: `${booking.bookingId}.pdf`, path: pdfPath }]
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (e) {
    console.error('Email failed:', e);
  }
}

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

// Update Status
// Update Status
router.patch('/:id/status', auth, authorize('admin'), async (req, res) => {
  try {
    const { status, cancellationReason } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    booking.status = status;
    if (cancellationReason) booking.cancellationReason = cancellationReason;
    if (status === 'confirmed') booking.confirmedAt = new Date();

    await booking.save();

    // ---------- Send Email on Confirmation ----------
    if (status === 'confirmed') {
      await sendConfirmationEmail(booking);
    }

    res.json({ success: true, booking });
  } catch (err) {
    console.error('Status update error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update Booking (Reschedule)
router.patch('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { date, time } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    booking.date = new Date(date);
    if (time) booking.time = time;
    booking.status = 'rescheduled';

    await booking.save();
    res.json({ success: true, booking });
  } catch (err) {
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

module.exports = router;