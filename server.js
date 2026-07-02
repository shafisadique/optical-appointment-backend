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

app.use(cors({
  origin: [
    'http://localhost:4400',
    'http://localhost:4200',
    'http://127.0.0.1:4200',
    'http://localhost:3000'
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ====================== DATABASE ======================

const mongoURI = process.env.MONGODB_URI;

if (!mongoURI) {
  console.error('❌ MONGODB_URI is missing');
  process.exit(1);
}

async function connectDB() {
  try {
    console.log('===================================');
    console.log('Connecting to MongoDB...');
    console.log('Node Version:', process.version);
    console.log('Mongoose Version:', mongoose.version);
    console.log('===================================');

    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 30000,
      family: 4,
      retryWrites: true
    });

  } catch (err) {


    if (err.reason) {
      console.log('\nReason:\n', err.reason);
    }

    console.log('\nComplete Error:\n');
    console.dir(err, { depth: null });

    console.log('=======================================\n');

    process.exit(1);
  }
}

mongoose.connection.on('connected', () => {
  console.log('🟢 Mongo Connected');
});

mongoose.connection.on('error', err => {
  console.error('🔴 Mongo Error');
  console.dir(err, { depth: null });
});

mongoose.connection.on('disconnected', () => {
  console.log('🟡 Mongo Disconnected');
});

connectDB();

// ====================== ROUTES ======================

app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/services', serviceRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK'
  });
});

// ====================== START SERVER ======================

app.listen(PORT, () => {
  console.log(`🚀 Server Running : http://localhost:${PORT}`);
});