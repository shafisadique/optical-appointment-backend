const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Import Admin model
const Admin = require('../models/Admin');
const auth = require('../middleware/auth');

// ==========================================
// Generate JWT Token
// ==========================================
function generateToken(admin) {
  return jwt.sign(
    {
      id: admin._id,
      email: admin.email,
      role: admin.role
    },
    process.env.JWT_SECRET || 'your-secret-key-change-this',
    { 
      expiresIn: '1d'
    }
  );
}

// ==========================================
// ADMIN LOGIN
// ==========================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    console.log('Looking for admin with email:', email.toLowerCase().trim());

    const admin = await Admin.findOne({
      email: email.toLowerCase().trim()
    });

    if (!admin) {
      console.log('Admin not found');
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    console.log('Admin found:', admin.email);

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account has been disabled'
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

    return res.json({
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
    console.error('Stack:', err.stack);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message // Remove this in production
    });
  }
});

// ==========================================
// DEMO LOGIN
// ==========================================
router.post('/demo-login', async (req, res) => {
  try {
    const demoEmail = process.env.DEMO_EMAIL || 'demo@eyecare.com';
    console.log('Looking for demo with email:', demoEmail);

    const demo = await Admin.findOne({
      email: demoEmail.toLowerCase().trim()
    });

    if (!demo) {
      console.log('Demo account not found');
      return res.status(404).json({
        success: false,
        message: 'Demo account not found. Please run the seed script.'
      });
    }


    const token = generateToken(demo);

    return res.json({
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
    console.error('Demo login error:', err);
    console.error('Stack:', err.stack);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message // Remove this in production
    });
  }
});

// ==========================================
// CURRENT USER
// ==========================================
router.get('/me', auth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select('-password');

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: admin
    });

  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// ==========================================
// TEST ENDPOINT - Check if model works
// ==========================================
router.get('/test', async (req, res) => {
  try {
    const count = await Admin.countDocuments();
    const admins = await Admin.find().select('-password');
    
    res.json({
      success: true,
      modelLoaded: typeof Admin === 'function',
      findOneExists: typeof Admin.findOne === 'function',
      count: count,
      admins: admins.map(a => ({
        name: a.name,
        email: a.email,
        role: a.role
      }))
    });
  } catch (err) {
    console.error('Test error:', err);
    res.status(500).json({
      success: false,
      error: err.message,
      stack: err.stack
    });
  }
});

module.exports = router;