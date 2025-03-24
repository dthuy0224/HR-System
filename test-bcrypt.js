const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const User = require("./models/user");
require("dotenv").config();

const MONGO_URL = process.env.DB_URL || "mongodb://127.0.0.1:27017/HRMS";

async function testPassword(email, plainPassword) {
  try {
    await mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      console.log("❌ User not found!");
      return;
    }

    console.log(`🔹 Testing password for: ${email}`);
    console.log(`🔹 Hashed password in DB: ${user.password}`);

    const isMatch = await bcrypt.compare(plainPassword, user.password);
    console.log(`✅ Password Match: ${isMatch}`);

  } catch (error) {
    console.error("❌ Error testing password:", error);
  } finally {
    try {
      await mongoose.disconnect();
      console.log("🔌 Database disconnected.");
    } catch (err) {
      console.error("⚠️ Error disconnecting database:", err);
    }
    process.exit(0);
  }
}

testPassword("pm@hrms.com", "Pm123456");
