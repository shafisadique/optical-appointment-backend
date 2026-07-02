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

// ====================== SECURITY ======================

app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use('/api', limiter);

app.use(cors({
  origin: [
    'http://localhost:4200',
    'http://localhost:4400',
    'http://127.0.0.1:4200',
    'http://localhost:3000',

    // Add your Angular deployed URL here
    // 'https://your-angular-app.vercel.app'
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ====================== DATABASE ======================

let isConnected = false;

async function connectDB() {
  if (isConnected) {
    return;
  }

  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    throw new Error('MONGODB_URI is missing');
  }

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

    isConnected = true;

    console.log('✅ MongoDB Connected');

  } catch (err) {

    console.error('❌ MongoDB Connection Failed');

    console.dir(err, { depth: null });

    throw err;
  }
}

mongoose.connection.on('connected', () => {
  console.log('🟢 Mongo Connected');
});

mongoose.connection.on('error', (err) => {
  console.error('🔴 Mongo Error');
  console.dir(err, { depth: null });
});

mongoose.connection.on('disconnected', () => {
  console.log('🟡 Mongo Disconnected');
});

// Connect before every request (only connects once)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed'
    });
  }
});

// ====================== HOME PAGE ======================

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Optical Backend</title>

<style>

body{
margin:0;
padding:0;
font-family:Arial;
background:#f3f5f7;
display:flex;
justify-content:center;
align-items:center;
height:100vh;
}

.card{
background:white;
padding:40px;
border-radius:15px;
box-shadow:0 10px 30px rgba(0,0,0,.1);
text-align:center;
max-width:550px;
}

h1{
color:#1565c0;
margin-bottom:10px;
}

p{
color:#555;
font-size:18px;
}

.badge{
display:inline-block;
margin-top:20px;
padding:10px 20px;
background:#4CAF50;
color:white;
border-radius:30px;
font-weight:bold;
}

.api{
margin-top:25px;
padding:15px;
background:#f7f7f7;
border-radius:10px;
text-align:left;
}

.api code{
color:#1565c0;
font-size:15px;
}

</style>

</head>

<body>

<div class="card">

<h1>👓 Optical Appointment Backend</h1>

<p>Your Optical Project Backend is Running Successfully.</p>

<div class="badge">
✅ Server Online
</div>

<div class="api">

<h3>Available API</h3>

<p><code>GET /api/health</code></p>

<p><code>/api/auth</code></p>

<p><code>/api/bookings</code></p>

<p><code>/api/services</code></p>

<p><code>/api/availability</code></p>

</div>

</div>

</body>

</html>
`);
});

// ====================== HEALTH ======================

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Backend Running',
    status: 'OK',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date()
  });
});

// ====================== ROUTES ======================

app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/services', serviceRoutes);

// ====================== 404 ======================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route Not Found'
  });
});

// ====================== ERROR HANDLER ======================

app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    success: false,
    message: 'Internal Server Error'
  });
});

// ====================== EXPORT FOR VERCEL ======================

module.exports = app;