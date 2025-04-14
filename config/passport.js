/**
 * This module configures Passport.js for user authentication.
 *
 * It sets up local authentication strategy and provides functions for serializing and deserializing users.
 * Serialization determines what data of the user object should be stored in the session.
 * Deserialization is used to retrieve this data from the session and attach it to the req.user object.
 *
 */


let passport = require("passport");
let User = require("../models/user");
let LocalStrategy = require("passport-local").Strategy;
const path = require('path');


// Passport's serializeUser method is used to determine which data of the user object should be stored in the session.
// Here, we are storing the user's id in the session.
passport.serializeUser(function (user, done) {
  done(null, user.id);
});


// Passport's deserializeUser method is used to retrieve the user data from the database.
// The user's id, which was stored in the session is used to find the user in the database.
// The found user object is then attached to the req.user object.
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});


// This code sets up a local authentication strategy with Passport.js for adding a new employee.
// It first validates the email and password from the request body.
// If there are validation errors, it stores the error messages and returns.
// If the validation passes, it checks if a user with the given email already exists.
// If the user exists, it returns an error message.
// If the user doesn't exist, it creates a new user with the given details, saves it to the database, and returns the new user.
passport.use(
  "local.add-employee",
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: true,
    },
    async function (req, email, password, done) {
      // Validate required fields
      req.checkBody("email", "Invalid email").notEmpty().isEmail();
      req.checkBody("password", "Password must be at least 6 characters").notEmpty().isLength({ min: 6 });
      req.checkBody("firstName", "First name must contain only letters").notEmpty().matches(/^[A-Za-zÀ-ỹ\s]+$/);
      req.checkBody("lastName", "Last name must contain only letters").notEmpty().matches(/^[A-Za-zÀ-ỹ\s]+$/);
      req.checkBody("DOB", "Date of birth is required").notEmpty().custom((value) => {
        const dob = new Date(value);
        const age = new Date().getFullYear() - dob.getFullYear();
        return age >= 18 && age <= 60 && dob.getFullYear() >= 1965;
      });
      req.checkBody("number", "Invalid phone number format").notEmpty().matches(/^(0|\+84)\d{9,10}$/);
      req.checkBody("jobTitle", "Job title is required").notEmpty();
      req.checkBody("department", "Department is required").notEmpty();
      req.checkBody("jobId", "Job ID must be 3 uppercase letters followed by 3 digits").notEmpty().matches(/^[A-Z]{3}\d{3}$/);
      req.checkBody("startDate", "Start date cannot be in the future").notEmpty().custom((value) => {
        return new Date(value) <= new Date();
      });
      req.checkBody("gender", "Gender must be either Male or Female").notEmpty().isIn(['Male', 'Female']);
      req.checkBody("workExperience", "Work experience must be Fresher, Junior, or Senior").notEmpty().isIn(['Fresher', 'Junior', 'Senior']);
      req.checkBody("addressCity", "City is required").notEmpty();
      req.checkBody("addressDistrict", "District is required").notEmpty();
      req.checkBody("addressDetails", "Address details must be at least 10 characters").notEmpty().isLength({ min: 10 });
      req.checkBody("birthplace", "Birthplace is required").notEmpty();
      req.checkBody("idNumber", "ID number must be exactly 12 digits").notEmpty().matches(/^\d{12}$/);
      req.checkBody("employmentType", "Employment type must be Full-time, Part-time, or Intern").notEmpty().isIn(['Full-time', 'Part-time', 'Intern']);

      const errors = req.validationErrors();
      if (errors) {
        const messages = [];
        errors.forEach((error) => {
          messages.push(error.msg);
        });
        return done(null, false, req.flash("error", messages));
      }

      try {
        // Check if email already exists
        const existingUser = await User.findOne({ email: email });
        if (existingUser) {
          return done(null, false, { message: "Email is already in use" });
        }

        // Check if jobId already exists
        const existingJobId = await User.findOne({ jobId: req.body.jobId });
        if (existingJobId) {
          return done(null, false, { message: "Job ID is already in use" });
        }

        // Check if idNumber already exists
        const existingIdNumber = await User.findOne({ idNumber: req.body.idNumber });
        if (existingIdNumber) {
          return done(null, false, { message: "ID Number is already in use" });
        }

        // Create new user
        const newUser = new User();
        
        // Account info
        newUser.email = email;
        newUser.password = newUser.encryptPassword(password);
        
        // Set type based on jobTitle
        if (req.body.jobTitle === "Accounts Manager") {
          newUser.type = "accounts_manager";
        } else if (req.body.jobTitle === "Project Manager") {
          newUser.type = "project_manager";
        } else {
          newUser.type = "employee";
        }

        // Personal info
        newUser.firstName = req.body.firstName;
        newUser.lastName = req.body.lastName;
        newUser.name = req.body.name;
        newUser.dateOfBirth = new Date(req.body.DOB);
        newUser.personalEmail = req.body.personalEmail;
        newUser.contactNumber = req.body.number;
        newUser.gender = req.body.gender;
        newUser.birthplace = {
          city: req.body.birthplace
        };
        newUser.address = {
          city: req.body.addressCity,
          district: req.body.addressDistrict,
          details: req.body.addressDetails
        };
        newUser.idNumber = req.body.idNumber;

        // Job info
        newUser.jobTitle = req.body.jobTitle;
        newUser.jobId = req.body.jobId;
        newUser.department = req.body.department;
        newUser.workExperience = req.body.workExperience;
        newUser.supervisor = req.body.supervisor || null;
        newUser.startDate = new Date(req.body.startDate);
        
        // Additional info
        newUser.profileImage = req.file ? `/images/employees/${req.body.jobId}${path.extname(req.file.originalname)}` : '/images/default-avatar.png';
        newUser.isActive = true;
        newUser.dateAdded = new Date();
        newUser.employmentType = req.body.employmentType;

        await newUser.save();
        return done(null, newUser);
      } catch (err) {
        return done(err);
      }
    }
  )
);


// This code sets up a local authentication strategy with Passport.js for signing in a user.
// It first validates the email and password from the request body.
// If there are validation errors, it stores the error messages and returns.
// If the validation passes, it checks if a user with the given email exists.
// If the user doesn't exist or the password is incorrect, it returns an error message.
// If the user exists and the password is correct, it returns the user.
passport.use(
  "local.signin",
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: true,
    },
    async function (req, email, password, done) {
      req.checkBody("email", "Invalid email").notEmpty().isEmail();
      req.checkBody("password", "Invalid password").notEmpty();
      let errors = req.validationErrors();
      if (errors) {
        let messages = [];
        errors.forEach(function (error) {
          messages.push(error.msg);
        });
        return done(null, false, req.flash("error", messages));
      }
      try {
        let user = await User.findOne({ email: email });
        if (!user) {
          return done(null, false, { message: "Email không tồn tại trong hệ thống" });
        }
        if (!user.validPassword(password)) {
          return done(null, false, { message: "Mật khẩu không chính xác" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);
