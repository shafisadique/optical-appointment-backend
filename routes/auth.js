const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const Admin = require('../models/Admin');
const dbConnect = require('../config/database');
const auth = require('../middleware/auth');

// Generate JWT Token
function generateToken(admin) {
  return jwt.sign(
    {
      id: admin._id,
      email: admin.email,
      role: admin.role
    },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
}

// ADMIN LOGIN
router.post('/login', async (req, res) => {
  try {
    await dbConnect();

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const admin = await Admin.findOne({ 
      email: email.toLowerCase().trim() 
    });

    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const validPassword = await admin.comparePassword(password);

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = generateToken(admin);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role
        }
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DEMO LOGIN
router.post('/demo-login', async (req, res) => {
  try {
    await dbConnect();

    const demoEmail = process.env.DEMO_EMAIL || 'demo@haiderdental.com';

    const demo = await Admin.findOne({ 
      email: demoEmail.toLowerCase().trim() 
    });

    if (!demo) {
      return res.status(404).json({
        success: false,
        message: 'Demo account not found'
      });
    }

    const token = generateToken(demo);

    res.json({
      success: true,
      message: 'Demo login successful',
      demo: true,
      data: {
        token,
        user: {
          id: demo._id,
          name: demo.name,
          email: demo.email,
          role: demo.role
        }
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get Current Logged-in User
router.get('/me', auth, async (req, res) => {
  try {
    await dbConnect();
    const admin = await Admin.findById(req.user.id).select('-password');

    if (!admin) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: admin });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;