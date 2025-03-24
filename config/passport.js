const passport = require("passport");
const { body, validationResult } = require("express-validator");
const User = require("../models/user");
const LocalStrategy = require("passport-local").Strategy;

// ✅ Serialize User (Lưu ID vào session)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// ✅ Deserialize User (Tìm User từ ID)
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    if (!user) {
      return done(null, false, { message: "User not found" });
    }
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// ✅ Local Strategy - Add Employee
passport.use(
  "local.add-employee",
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: true,
    },
    async (req, email, password, done) => {
      // Validation bằng express-validator
      await Promise.all([
        body("email").isEmail().withMessage("⚠️ Invalid email!").run(req),
        body("password")
          .isLength({ min: 6 })
          .withMessage("⚠️ Password must be at least 6 characters long!")
          .run(req),
      ]);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return done(null, false, req.flash("error", errors.array().map(err => err.msg)));
      }

      try {
        let user = await User.findOne({ email: email });
        if (user) {
          return done(null, false, { message: "⚠️ Email is already in use" });
        }

        // ✅ Xác định loại người dùng
        const userTypes = {
          "Accounts Manager": "accounts_manager",
          "Project Manager": "project_manager",
        };
        const userType = userTypes[req.body.designation] || "employee";

        let newUser = new User({
          email,
          type: userType,
          password: User.encryptPassword(password),
          name: req.body.name,
          dateOfBirth: req.body.DOB ? new Date(req.body.DOB) : null,
          contactNumber: req.body.number,
          department: req.body.department,
          skills: req.body["skills[]"] || [],
          designation: req.body.designation,
          dateAdded: new Date(),
        });

        await newUser.save();
        return done(null, newUser);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// ✅ Local Strategy - Sign In
passport.use(
  "local.signin",
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: true,
    },
    async (req, email, password, done) => {
      // Validation bằng express-validator
      await Promise.all([
        body("email").isEmail().withMessage("Invalid email!").run(req),
        body("password").notEmpty().withMessage("Password cannot be empty!").run(req),
      ]);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return done(null, false, req.flash("error", errors.array().map(err => err.msg)));
      }

      try {
        let user = await User.findOne({ email: email });
        if (!user || !user.validPassword(password)) {
          return done(null, false, { message: "Incorrect email or password" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);
