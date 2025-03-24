const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/user");
const bcrypt = require("bcrypt");
const csrf = require("csurf");
const rateLimit = require("express-rate-limit");
const { body, query, validationResult } = require("express-validator");

const csrfProtection = csrf();

// ✅ Middleware bảo vệ CSRF cho các trang nhạy cảm
router.use(["/signup", "/forgot-password"], csrfProtection, (req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

// ✅ Giới hạn số lần kiểm tra email
const emailCheckLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 phút
  max: 10, // 10 lần mỗi IP
  message: "Too many email checks. Try again later.",
});

// ✅ Regex kiểm tra email hợp lệ
const emailRegex = /^[^\s@]+@hrms\.com$/;

// ✅ Hàm kiểm tra email có tồn tại không
async function emailExists(email) {
  if (!email || !emailRegex.test(email.trim())) return false;
  return await User.findOne({ email: email.trim().toLowerCase() }) ? true : false;
}

// ✅ Middleware bắt lỗi tự động
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ✅ Giới hạn số lần đăng nhập & Block người dùng
const BLOCK_DURATION = 15 * 60 * 1000; // 15 phút
const MAX_ATTEMPTS = 5;

// Middleware kiểm tra nếu user bị block
router.use((req, res, next) => {
  if (!req.session.loginAttempts) {
    req.session.loginAttempts = { count: 0, blockedUntil: null };
  }

  const now = Date.now();
  if (req.session.loginAttempts.blockedUntil && now < req.session.loginAttempts.blockedUntil) {
    return res.status(403).json({
      error: "blocked",
      message: `You have been temporarily blocked. Try again in ${Math.ceil(
        (req.session.loginAttempts.blockedUntil - now) / 60000
      )} minutes.`,
    });
  }

  next();
});

// ✅ Hiển thị trang đăng nhập
router.get("/", csrfProtection, (req, res) => {
  if (req.isAuthenticated()) return res.redirect("/check-type");

  const messages = req.flash("error");
  res.render("login", {
    title: "Log In",
    csrfToken: req.csrfToken(),
    messages,
    hasErrors: messages.length > 0,
  });
});

// ✅ Xử lý đăng nhập `/login`
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Invalid email!"),
    body("password").notEmpty().withMessage("Password cannot be empty!"),
  ],
  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: "validation_failed", messages: errors.array().map(err => err.msg) });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
      return res.status(404).json({ error: "email_not_found", message: "This email is not registered!" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      req.session.loginAttempts.count += 1;

      if (req.session.loginAttempts.count >= MAX_ATTEMPTS) {
        req.session.loginAttempts.blockedUntil = Date.now() + BLOCK_DURATION;
        req.session.loginAttempts.count = 0;
        return res.status(403).json({
          error: "blocked",
          message: "Too many failed login attempts. You are blocked for 15 minutes.",
        });
      }

      return res.status(401).json({
        error: "invalid_password",
        message: `Wrong password! Attempts remaining: ${MAX_ATTEMPTS - req.session.loginAttempts.count}`,
      });
    }

    // ✅ Reset login attempts on successful login
    req.session.loginAttempts = { count: 0, blockedUntil: null };

    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ error: "server_error", message: "Login failed!" });
      }
      return res.status(200).json({ userType: user.type });
    });
  })
);

// ✅ Kiểm tra loại tài khoản và chuyển hướng
router.get("/check-type", (req, res) => {
  if (!req.user) return res.redirect("/");
  req.session.user = req.user;

  switch (req.user.type) {
    case "project_manager":
    case "accounts_manager":
      return res.redirect("/manager/");
    case "employee":
      return res.redirect("/employee/");
    default:
      return res.redirect("/admin/");
  }
});

// ✅ Hiển thị trang forgot-password
router.get("/forgot-password", csrfProtection, (req, res) => {
  res.render("forgot-password", { csrfToken: req.csrfToken() });
});

// ✅ Đăng xuất
router.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => res.redirect("/"));
  });
});

// ✅ Xử lý kiểm tra email tồn tại (`check-email`)
router.get(
  "/check-email",
  emailCheckLimiter,
  [query("email").isEmail().withMessage("Invalid email format!")],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: "validation_failed", messages: errors.array().map(err => err.msg) });
    }

    const exists = await emailExists(req.query.email);
    res.json({ exists });
  })
);

module.exports = router;
