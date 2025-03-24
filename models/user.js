const mongoose = require("mongoose");
const bcrypt = require("bcrypt");


const Schema = mongoose.Schema;


const UserSchema = new Schema({
  type: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true, // ✅ Lưu email dưới dạng chữ thường
    trim: true, // ✅ Xóa khoảng trắng thừa
    match: /^[^\s@]+@hrms\.com$/, // ✅ Regex kiểm tra email hợp lệ
  },
  password: { type: String, required: true },
  name: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  contactNumber: { type: String, required: true },
  department: { type: String },
  Skills: [{ type: String }], // 
  designation: { type: String },
  dateAdded: { type: Date, default: Date.now },
});





// ✅ Mã hóa mật khẩu với bcrypt (chạy trước khi lưu vào DB)
UserSchema.pre("save", async function (next) {
  try {
    if (!this.isModified("password")) return next(); // Chỉ hash nếu mật khẩu thay đổi


    const isHashed = /^\$2[ayb]\$.{56}$/.test(this.password); // Kiểm tra định dạng bcrypt
    if (isHashed) return next(); // Nếu đã hash rồi thì bỏ qua


    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    console.error("❌ Error hashing password:", error);
    next(error);
  }
});


// ✅ Kiểm tra mật khẩu nhập vào với mật khẩu đã hash trong DB
UserSchema.methods.validPassword = async function (password) {
  if (!password) return false;
  return await bcrypt.compare(password, this.password);
};


const User = mongoose.model("User", UserSchema);


// ✅ Bắt buộc tạo index khi khởi chạy
User.createIndexes().then(() => {
  console.log("✅ Indexes created successfully!");
}).catch((error) => {
  console.error("❌ Error creating indexes:", error);
});


module.exports = User;



