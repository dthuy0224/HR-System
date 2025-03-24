const express = require("express");
const router = express.Router();
const User = require("../models/user");
const csrf = require("csurf");
const cookieParser = require("cookie-parser");
const validator = require("validator");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
require("dotenv").config();

// ✅ CSRF Protection
const csrfProtection = csrf({ cookie: true });
router.use(cookieParser()); 

console.log("✅ Forgot Password route file loaded");

// ✅ Nodemailer Setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ GET Route - Render Forgot Password Page (Newly Added)
router.get("/", csrfProtection, (req, res) => {
  res.render("forgot-password", { csrfToken: req.csrfToken() });
});

// ✅ GET CSRF Token for frontend
router.get("/csrf-token", csrfProtection, (req, res) => {
  return res.json({ csrfToken: req.csrfToken() });
});

// ✅ POST Route - Handle Forgot Password
router.post("/", csrfProtection, async function (req, res) {
  console.log("🚀 POST /forgot-password called with:", req.body);

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email cannot be empty." });
  }

  if (!validator.isEmail(email)) {
    return res.status(400).json({ error: "Invalid email format." });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "No account found with this email." });
    }

    const newPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    await user.save();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your New Password",
      html: `
        <p>Dear User,</p>
        <p>Your new password is: <strong style="color:red;">${newPassword}</strong></p>
        <p>For security reasons, please change your password immediately.</p>
        <p>Best Regards,</p>
        <p><strong>HRMS Team</strong></p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${email}`);

    return res.json({ message: "A new password has been sent to your email." });
  } catch (err) {
    console.error("❌ Error in forgot password:", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

module.exports = router;
