const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Availability = require('../models/Availability');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');



// At the top of routes/bookings.js
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// PDF Directory
const pdfDir = path.join(__dirname, '../public/pdfs');
if (!fs.existsSync(pdfDir)) {
  fs.mkdirSync(pdfDir, { recursive: true });
}

// Nodemailer Transporter (Fixed)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Then your generateBookingPDF and sendBookingEmail functions remain mostly same.
// Just make sure sendBookingEmail uses the transporter:
async function sendBookingEmail(booking, pdfPath) {
  const mailOptions = {
    from: `"Haider Dental Care" <${process.env.EMAIL_USER}>`,
    to: booking.patient.email,
    subject: `Appointment Confirmed - ${booking.bookingId}`,
    html: `
      <h2>Thank you, ${booking.patient.name}!</h2>
      <p>Your appointment has been booked successfully.</p>
      <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
      <p><strong>Date:</strong> ${booking.date.toLocaleDateString('en-IN')}</p>
      <p><strong>Service:</strong> ${booking.service.name}</p>
      <p>Our team will confirm shortly.</p>
    `,
    attachments: [{
      filename: `${booking.bookingId}.pdf`,
      path: pdfPath
    }]
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${booking.patient.email}`);
  } catch (emailErr) {
    console.error('Email sending failed:', emailErr);
    // Don't fail the booking if email fails
  }
}

// ====================== PUBLIC: Create Booking ======================
router.post('/', async (req, res) => {
  try {
    const { date, service, patient } = req.body;

    if (!date || !service || !patient?.name || !patient?.phone || !patient?.email) {
      return res.status(400).json({
        success: false,
        message: 'Date, service and complete patient details are required'
      });
    }

    const bookingDate = new Date(date);
    bookingDate.setHours(0, 0, 0, 0);

    // Availability Check
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

    // Duplicate booking check
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

    // Generate Booking ID
    const bookingId = `HD-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(Math.floor(10000 + Math.random() * 90000))}`;

    // Create Booking
    const booking = new Booking({
      bookingId,
      service: {
        _id: service._id,
        name: service.name
      },
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

    // Generate PDF
    const pdfPath = await generateBookingPDF(booking);

    // Send Email
    await sendBookingEmail(booking, pdfPath);

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully! Confirmation sent to your email.',
      bookingId: booking.bookingId,
      booking
    });

  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
});

// ====================== PDF Generator ======================
async function generateBookingPDF(booking) {
  return new Promise((resolve, reject) => {
    const pdfPath = path.join(pdfDir, `${booking.bookingId}.pdf`);
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(pdfPath);

    doc.pipe(stream);

    // Header
    doc.fontSize(20).text('Haider Dental Care', { align: 'center' });
    doc.fontSize(12).text('Professional Dental Services', { align: 'center' });
    doc.moveDown();

    doc.fontSize(16).text('Appointment Confirmation', { align: 'center' });
    doc.moveDown(2);

    // Details
    doc.fontSize(12);
    doc.text(`Booking ID: ${booking.bookingId}`);
    doc.text(`Date: ${booking.date.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
    doc.text(`Service: ${booking.service.name}`);
    doc.moveDown();

    doc.text(`Patient Name: ${booking.patient.name}`);
    doc.text(`Phone: ${booking.patient.phone}`);
    doc.text(`Email: ${booking.patient.email}`);
    
    if (booking.patient.message) {
      doc.moveDown();
      doc.text(`Message: ${booking.patient.message}`);
    }

    doc.moveDown(2);
    doc.text('Status: Pending (Admin will confirm soon)', { color: 'orange' });
    doc.moveDown();

    doc.text('Thank you for choosing Haider Dental Care!', { align: 'center' });
    doc.text('Please bring this confirmation on your visit.', { align: 'center' });

    doc.end();

    stream.on('finish', () => resolve(pdfPath));
    stream.on('error', reject);
  });
}

// ====================== Send Email ======================
async function sendBookingEmail(booking, pdfPath) {
  const mailOptions = {
    from: `"Haider Dental Care" <${process.env.EMAIL_USER}>`,
    to: booking.patient.email,
    subject: `Appointment Confirmation - ${booking.bookingId}`,
    html: `
      <h2>Thank you for booking with Haider Dental Care!</h2>
      <p>Your appointment has been received.</p>
      <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
      <p><strong>Date:</strong> ${booking.date.toLocaleDateString('en-IN')}</p>
      <p><strong>Service:</strong> ${booking.service.name}</p>
      <p>Our team will confirm your appointment shortly.</p>
      <p>Please find your confirmation attached.</p>
    `,
    attachments: [
      {
        filename: `${booking.bookingId}.pdf`,
        path: pdfPath
      }
    ]
  };

  await transporter.sendMail(mailOptions);
}

// ====================== ADMIN ROUTES (Existing + Small Improvement) ======================
router.get('/', auth, authorize('admin'), async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ date: -1, createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id/confirm', auth, authorize('admin'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    booking.status = 'confirmed';
    booking.confirmedAt = new Date();
    await booking.save();

    res.json({ success: true, message: 'Appointment confirmed', booking });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;