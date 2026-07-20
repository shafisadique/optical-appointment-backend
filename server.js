require('dotenv').config();

const dns = require('node:dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const dbConnect = require('./config/database');

const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const availabilityRoutes = require('./routes/availability');
const serviceRoutes = require('./routes/services');
const visitorRoutes = require('./routes/visitor');

const app = express();

// ====================== SECURITY ======================
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use('/api', limiter);

// ====================== CORS FIX ======================
const allowedOrigins = [
  'http://localhost:4200',
  'http://localhost:4300',
  'https://haider-dental-care.vercel.app',
  'https://haider-dental-care.vercel.app',   // Add your frontend URL
  process.env.FRONTEND_URL || ''
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());

// ====================== ROUTES ======================
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/visitor', visitorRoutes);

// Serve PDFs
app.use('/pdfs', express.static(path.join(__dirname, 'public/pdfs')));

// Health Check
app.get('/api/health', async (req, res) => {
  try {
    await dbConnect();
    res.json({ status: 'OK', mongodb: 'Connected' });
  } catch (err) {
    res.status(500).json({ status: 'Error', message: err.message });
  }
});

// Root
app.get('/', (req, res) => {
  res.json({ message: 'Haider Dental Care Backend Running' });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.url}` });
});

module.exports = app;

// Local Development
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
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