const express = require('express');
const router = express.Router();
const Visitor = require('../models/Visitor');

// Track daily visitors
router.post('/track', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    let visitor = await Visitor.findOne({ date: today });

    if (!visitor) {
      visitor = new Visitor({ date: today, count: 1, totalVisits: 1 });
    } else {
      visitor.count += 1;
      visitor.totalVisits += 1;
    }

    await visitor.save();
    res.json({ success: true });
  } catch (err) {
    console.error('Visitor tracking error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get visitor stats (Admin only)
router.get('/stats', async (req, res) => {
  try {
    const totalVisitors = await Visitor.aggregate([
      { $group: { _id: null, total: { $sum: '$totalVisits' } } }
    ]);

    const today = new Date().toISOString().split('T')[0];
    const todayVisitor = await Visitor.findOne({ date: today });

    res.json({
      totalVisitors: totalVisitors[0]?.total || 0,
      todayVisitors: todayVisitor?.count || 0
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;