require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const dns = require('node:dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const createStrongAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const email = "admin@haiderdental.com";           // Change if you want
    const password = "HaiderDental@2026Secure!";     // ← Very Strong Password

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      console.log('✅ Admin already exists.');
      return;
    }

    const admin = new Admin({
      name: "Haider Dental Admin",
      email: email,
      password: password,        // Will be auto-hashed by pre-save hook
      role: "admin",
      isActive: true
    });

    await admin.save();

    console.log('\n✅ Strong Admin Account Created Successfully!\n');
    console.log('Email    :', email);
    console.log('Password :', password);
    console.log('\n⚠️  Please change this password after first login!\n');

  } catch (err) {
    console.error('❌ Error creating admin:', err.message);
  } finally {
    mongoose.connection.close();
  }
};

createStrongAdmin();