const express = require('express');
const router = express.Router();

const Availability = require('../models/Availability');
const Booking = require('../models/Booking');

const auth = require('../middleware/auth');
const authorize = require('../middleware/role');

// =====================================
// PUBLIC
// Get Settings
// =====================================

router.get('/', async (req, res) => {
  try {

    let availability = await Availability.findOne();

    if (!availability) {
      availability = await Availability.create({
        dailyLimit: 20,
        blockedDates: []
      });
    }

    res.json(availability);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: 'Server Error'
    });

  }
});


// =====================================
// PUBLIC
// Calendar Availability
// =====================================

router.get('/calendar', async (req, res) => {

  try {

    const year = Number(req.query.year);
    const month = Number(req.query.month);

    if (!year || !month) {

      return res.status(400).json({
        success: false,
        message: 'Year and Month are required.'
      });

    }

    let availability = await Availability.findOne();

    if (!availability) {

      availability = await Availability.create({
        dailyLimit: 20,
        blockedDates: []
      });

    }

    const dailyLimit = availability.dailyLimit;

    const startDate = new Date(year, month - 1, 1);

    const endDate = new Date(year, month, 0);

    endDate.setHours(23, 59, 59, 999);

    const bookings = await Booking.find({

      date: {
        $gte: startDate,
        $lte: endDate
      },

      status: {
        $nin: ['cancelled', 'completed']
      }

    });

    const bookingMap = {};

    bookings.forEach(booking => {

      const key = booking.date.toISOString().split('T')[0];

      bookingMap[key] = (bookingMap[key] || 0) + 1;

    });

    const blockedDates = availability.blockedDates.map(d =>
      new Date(d.date).toISOString().split('T')[0]
    );

    const result = [];

    const totalDays = new Date(year, month, 0).getDate();

    for (let day = 1; day <= totalDays; day++) {

      const current = new Date(year, month - 1, day);

      const key = current.toISOString().split('T')[0];

      if (blockedDates.includes(key)) {

        result.push({
          date: key,
          status: 'unavailable'
        });

        continue;

      }

      const booked = bookingMap[key] || 0;

      if (booked >= dailyLimit) {

        result.push({
          date: key,
          status: 'unavailable'
        });

      }
      else if (booked >= dailyLimit - 5) {

        result.push({
          date: key,
          status: 'limited'
        });

      }
      else {

        result.push({
          date: key,
          status: 'available'
        });

      }

    }

    res.json(result);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: 'Server Error'
    });

  }

});


// =====================================
// ADMIN
// Update Availability
// =====================================

router.put('/', auth, authorize('admin'), async (req, res) => {

  try {

    const { dailyLimit, blockedDates } = req.body;

    let availability = await Availability.findOne();

    if (!availability) {

      availability = new Availability();

    }

    availability.dailyLimit = dailyLimit;

    availability.blockedDates = blockedDates || [];

    availability.updatedAt = new Date();

    await availability.save();

    res.json({
      success: true,
      availability
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: 'Server Error'
    });

  }

});

module.exports = router;