const express = require("express");
const path = require("path");
const fs = require("fs");
const logger = require("morgan");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const session = require("express-session");
const passport = require("passport");
const flash = require("connect-flash");
const MongoStore = require("connect-mongo");
const csrf = require("csurf");
const helmet = require("helmet");
const compression = require("compression");
const Boom = require("@hapi/boom");
const listEndpoints = require("express-list-endpoints");
require("dotenv").config();


const app = express();


// ✅ Kết nối MongoDB
const mongoose = require("mongoose");
const MONGO_URL = process.env.DB_URL?.trim() || "mongodb://127.0.0.1:27017/HRMS";


async function connectDB() {
  try {
    await mongoose.connect(MONGO_URL);
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ Database connection error:", err);
    process.exit(1);
  }
}
connectDB();


mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB connection error:", err);
});


mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ MongoDB disconnected. Reconnecting...");
  connectDB();
});


// ✅ Middleware Bảo mật & Tối ưu hiệu suất
app.use(helmet());
app.use(compression());


// ✅ Cấu hình View Engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");


// ✅ Middleware Xử lý Request
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());


// ✅ Cấu hình Static Files
app.use(express.static(path.join(__dirname, "public")));


// ✅ Cấu hình Session với MongoStore
const sessionStore = MongoStore.create({
  mongoUrl: MONGO_URL,
  collectionName: "sessions",
});


app.use(
  session({
    secret: process.env.SESSION_SECRET || "mysupersecret",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      maxAge: 180 * 60 * 1000, // 3 giờ
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    },
  })
);


// ✅ Khởi tạo Passport
require("./config/passport");
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());


// ✅ CSRF Protection (Bỏ qua cho Login & API)
const csrfProtection = csrf();
app.use((req, res, next) => {
  if (req.path === "/login" || req.path === "/logout" || /^\/api\//.test(req.path)) {
    return next(); // Skip CSRF for login, logout, and APIs
  }
  csrfProtection(req, res, next);
});


// ✅ Đính kèm CSRF Token vào Response
app.use((req, res, next) => {
  try {
    res.locals.csrfToken = req.csrfToken ? req.csrfToken() : null;
  } catch (error) {
    console.error("❌ CSRF Token Error:", error);
    res.locals.csrfToken = null;
  }
  next();
});


// ✅ Flash Messages Middleware
app.use((req, res, next) => {
  res.locals.title = "HRMS System";
  res.locals.login = req.isAuthenticated();
  res.locals.session = req.session;
  res.locals.messages = req.flash();
  next();
});


// ✅ Debug Session & CSRF Token (Only in Development)
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log("Session Data:", req.session);
    console.log("CSRF Token in Session:", req.session?.csrfSecret);
    next();
  });
}


// ✅ Load Routes
const index = require("./routes/index");
const admin = require("./routes/admin");
const employee = require("./routes/employee");
const manager = require("./routes/manager");
const forgotPasswordRoutes = require("./routes/forgotPassword");


// ✅ Đăng ký Routes
app.use("/", index);
app.use("/admin", admin);
app.use("/manager", manager);
app.use("/employee", employee);
app.use("/forgot-password", forgotPasswordRoutes);


// ✅ Xử lý lỗi CSRF
app.use((err, req, res, next) => {
  if (err.code === "EBADCSRFTOKEN") {
    console.error("❌ CSRF Error:", err);
    return res.status(403).render("error", { message: "Invalid CSRF token.", error: {} });
  }
  next(err);
});


// ✅ Xử lý Lỗi 404
app.use((req, res, next) => {
  next(Boom.notFound("Page Not Found"));
});


// ✅ Middleware Xử lý Lỗi Chung
app.use((err, req, res, next) => {
  console.error("❌ Error:", err);
  const statusCode = err.isBoom ? err.output.statusCode : 500;
  const message = err.isBoom ? err.output.payload.message : "Internal Server Error";
  res.status(statusCode).render("error", { message, error: req.app.get("env") === "development" ? err : {} });
});


// ✅ Debug - Liệt kê Routes
if (process.env.NODE_ENV !== "test") {
  console.log("✅ Registered Routes:", listEndpoints(app));
}


module.exports = app;





