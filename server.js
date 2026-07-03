const dns = require('node:dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const availabilityRoutes = require('./routes/availability');
const serviceRoutes = require('./routes/services');

const app = express();
const PORT = process.env.PORT || 3000;

console.log(`🚀 Starting server on port ${PORT}...`);

// ====================== SECURITY ======================
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use('/api', limiter);

// ====================== CORS ======================
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : [
      'http://localhost:4400',
      'http://localhost:4200',
      'http://127.0.0.1:4200',
      'https://eyeglasses-seven.vercel.app',
      'https://eyeglasses-seven-git-*.vercel.app'
    ];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ====================== DATABASE CONNECTION (Fixed for Vercel) ======================

const mongoURI = process.env.MONGODB_URI;

if (!mongoURI) {
  console.error('❌ MONGODB_URI is missing in environment variables');
  process.exit(1);
}

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    console.log('🟢 Using cached MongoDB connection');
    return cached.conn;
  }

  if (!cached.promise) {
    console.log('🟡 Connecting to MongoDB...');
    cached.promise = mongoose
      .connect(mongoURI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        family: 4,
        retryWrites: true,
        maxPoolSize: 5,
        minPoolSize: 1,
      })
      .then((mongooseInstance) => {
        console.log('🟢 MongoDB connected successfully');
        return mongooseInstance;
      })
      .catch((err) => {
        console.error('🔴 MongoDB connection failed:', err.message);
        cached.promise = null;
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    console.error('❌ Failed to establish MongoDB connection');
    throw err;
  }
}

// Connect on startup
connectDB().catch(err => console.error('Initial connection failed:', err.message));

// ====================== ROUTES ======================

app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/services', serviceRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected' });
});

// ====================== START SERVER (Local) ======================
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

// ====================== EXPORT FOR VERCEL ======================
module.exports = app;