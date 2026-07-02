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

// ====================== SECURITY ======================
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use('/api', limiter);

// ====================== CORS ======================
// Allow multiple origins from environment variable (comma-separated)
// e.g., ALLOWED_ORIGINS=http://localhost:4200,https://myapp.vercel.app
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : [
      'http://localhost:4400',
      'http://localhost:4200',
      'http://127.0.0.1:4200',
      'http://localhost:3000',
    ];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ====================== DATABASE (with caching for serverless) ======================

const mongoURI = process.env.MONGODB_URI;

if (!mongoURI) {
  console.error('❌ MONGODB_URI is missing');
  process.exit(1);
}

// Global cache for MongoDB connection (reused across serverless invocations)
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  // If connection already exists, return it
  if (cached.conn) {
    console.log('🟢 Using cached MongoDB connection');
    return cached.conn;
  }

  // If no connection promise exists, create one
  if (!cached.promise) {
    console.log('🟡 Creating new MongoDB connection...');
    cached.promise = mongoose
      .connect(mongoURI, {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 60000,
        connectTimeoutMS: 30000,
        family: 4,
        retryWrites: true,
        // Recommended for serverless environments:
        maxPoolSize: 1,
      })
      .then((mongoose) => {
        console.log('🟢 MongoDB connected successfully');
        return mongoose;
      })
      .catch((err) => {
        console.error('🔴 MongoDB connection error:');
        console.dir(err, { depth: null });
        // Clear promise so we can retry on next invocation
        cached.promise = null;
        throw err;
      });
  }

  // Wait for the connection to resolve
  cached.conn = await cached.promise;
  return cached.conn;
}

// Establish the connection when the module loads
connectDB().catch((err) => {
  console.error('❌ Failed to connect to MongoDB on startup:', err);
  // Do not exit the process in serverless – let the function fail gracefully
});

// Optional: listen to Mongoose events for logging
mongoose.connection.on('connected', () => {
  console.log('🟢 Mongoose connected');
});
mongoose.connection.on('error', (err) => {
  console.error('🔴 Mongoose error');
  console.dir(err, { depth: null });
});
mongoose.connection.on('disconnected', () => {
  console.log('🟡 Mongoose disconnected');
});

// ====================== ROUTES ======================

app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/services', serviceRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
  });
});

// ====================== EXPORT FOR VERCEL ======================

module.exports = app;