require('dotenv').config();

const dns = require('node:dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const dbConnect = require('./config/database');

const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const availabilityRoutes = require('./routes/availability');
const serviceRoutes = require('./routes/services');
const visitorRoutes = require('./routes/visitor');

const app = express();
const PORT = process.env.PORT || 3000;

// ====================== SECURITY MIDDLEWARE ======================
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:4200', 'http://localhost:4400'];

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

// Health Check
app.get('/api/health', async (req, res) => {
  try {
    await dbConnect();
    res.json({ 
      status: 'OK', 
      mongodb: 'Connected' 
    });
  } catch (err) {
    res.status(500).json({ status: 'Error', mongodb: 'Disconnected' });
  }
});

// ====================== EXPORT FOR VERCEL ======================
module.exports = app;

// Local Development
if (require.main === module) {
  const startServer = async () => {
    try {
      await dbConnect();
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
      });
    } catch (err) {
      console.error('❌ Failed to start server:', err);
    }
  };
  startServer();
}