// server.js
require('dotenv').config();

const dns = require('node:dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const dbConnect = require('./config/database'); // Make sure path is correct

const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const availabilityRoutes = require('./routes/availability');
const serviceRoutes = require('./routes/services');
const visitorRoutes = require('./routes/visitor');

const app = express();
const PORT = process.env.PORT || 3000;

console.log(`🚀 Starting server...`);

// ====================== SECURITY & MIDDLEWARE ======================
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
});
app.use('/api', limiter);

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : [
      'http://localhost:4200',
      'http://localhost:4400',
      'http://127.0.0.1:4200',
      'https://eyeglasses-seven.vercel.app',
      'https://optical-appointment-backend.vercel.app'
    ];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ====================== ROUTES ======================
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/visitor', visitorRoutes);

// Health Check Route
app.get('/api/health', async (req, res) => {
  try {
    await dbConnect();
    const status = {
      server: 'OK',
      mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
      timestamp: new Date().toISOString()
    };
    res.json(status);
  } catch (err) {
    console.error('Health check error:', err.message);
    res.status(500).json({ 
      server: 'OK', 
      mongodb: 'Connection Failed',
      error: err.message 
    });
  }
});

// ====================== EXPORT FOR VERCEL (Important) ======================
module.exports = app;

// ====================== LOCAL DEVELOPMENT ONLY ======================
if (require.main === module) {
  const startLocalServer = async () => {
    try {
      await dbConnect();
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      });
    } catch (err) {
      console.error('❌ Failed to start server:', err.message);
      process.exit(1);
    }
  };

  startLocalServer();
}