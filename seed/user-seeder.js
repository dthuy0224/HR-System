/**
 * This script seeds the User collection in the MongoDB database.
 */
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/user");
require("dotenv").config();


const MONGO_URL = process.env.DB_URL || "mongodb://127.0.0.1:27017/HRMS";
const saltRounds = 10; // Number of salt rounds for bcrypt


async function connectDB() {
  try {
    await mongoose.connect(MONGO_URL);
    console.log("✅ Database connected successfully.");
  } catch (err) {
    console.error("❌ Database connection error:", err);
    process.exit(1);
  }
}


const users = [
  {
    type: "project_manager",
    email: "pm@hrms.com",
    password: "Pm123456",
    name: "PROJECT MANAGER",
    dateOfBirth: new Date("1990-05-20"),
    contactNumber: "0333-1234567"
  },
  {
    type: "accounts_manager",
    email: "am@hrms.com",
    password: "Am123456",
    name: "MANAGER",
    dateOfBirth: new Date("1990-08-26"),
    contactNumber: "0300-5432011"
  },
  {
    type: "employee",
    email: "employee1@hrms.com",
    password: "A12345678",
    name: "EMPLOYEE",
    dateOfBirth: new Date("1994-06-26"),
    contactNumber: "0322-5432011"
  },
  {
    type: "employee",
    email: "employee2@hrms.com",
    password: "A12345678",
    name: "EMPLOYEE",
    dateOfBirth: new Date("1996-05-26"),
    contactNumber: "0311-5432011"
  },
  {
    type: "admin",
    email: "admin@hrms.com",
    password: "Admin123",
    name: "ADMIN",
    dateOfBirth: new Date("1980-05-26"),
    contactNumber: "0333-5432011"
  },
  {
    type: "admin",
    email: "hrms0431290623@hrms.com",
    password: "0431290623@Hrms",
    name: "ADMIN",
    dateOfBirth: new Date("1980-05-26"),
    contactNumber: "0333-5432011"
  }
];


async function seedUsers() {
  try {
    await connectDB();


    const existingUsers = await User.countDocuments();
    if (existingUsers > 0) {
      console.log("Users already exist in the database. Skipping deletion.");
    } else {
      console.log("Deleting existing users...");
      await User.deleteMany({});
    }


    for (const userData of users) {
      // Kiểm tra xem user đã tồn tại chưa
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        console.log(`User ${userData.email} already exists. Skipping.`);
        continue;
      }


      // Hash mật khẩu đúng cách
      userData.password = await bcrypt.hash(userData.password, saltRounds);
      await User.create(userData);
      console.log(`User ${userData.email} added.`);
    }


    console.log("All users have been added successfully!");
  } catch (error) {
    console.error("Error seeding users:", error);
  } finally {
    mongoose.disconnect();
    console.log("Database disconnected.");
  }
}


seedUsers();





