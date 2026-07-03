const express = require('express');
const router = express.Router();
const Visitor = require('../models/Visitor');
const dbConnect = require('../config/database');   // ← Correct import

// Record a visit
router.post('/record', async (req, res) => {
  try {
    await dbConnect();                    // ← Important

    const today = new Date().toISOString().split('T')[0];

    let visitor = await Visitor.findOne({ date: today });

    if (!visitor) {
      visitor = new Visitor({ 
        date: today, 
        count: 1, 
        totalVisits: 1 
      });
    } else {
      visitor.count += 1;
      visitor.totalVisits += 1;
    }

    await visitor.save();

    res.json({ 
      success: true, 
      today: visitor.count,
      total: visitor.totalVisits 
    });
  } catch (err) {
    console.error('Visitor record error:', err);
    res.status(500).json({ error: 'Failed to record visit' });
  }
});

// Get stats (optional - for admin)
router.get('/stats', async (req, res) => {
  try {
    await dbConnect();
    const stats = await Visitor.find().sort({ date: -1 });
    res.json(stats);
  } catch (err) {
    console.error('Visitor stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;