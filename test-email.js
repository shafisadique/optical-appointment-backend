require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,                    // Use STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false       // ← This fixes the certificate error
  }
});

(async () => {
  try {
    await transporter.verify();
    console.log("✅ SMTP Connection Verified Successfully!");

    const info = await transporter.sendMail({
      from: `"EDGlobe" <${process.env.EMAIL_USER}>`,
      to: '1234sadique1234@gmail.com',
      subject: "Test Email from Backend",
      html: `
        <h2>Test Email</h2>
        <p>This email was sent successfully at ${new Date().toLocaleString()}</p>
      `
    });

    console.log("✅ Email Sent Successfully! Message ID:", info.messageId);
  } catch (err) {
    console.error("❌ Email Error:", err.message);
    if (err.code === 'ESOCKET') {
      console.log("💡 Tip: Check your .env EMAIL_USER and EMAIL_PASS");
    }
  }
})();