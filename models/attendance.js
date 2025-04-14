var mongoose = require("mongoose");
var Schema = mongoose.Schema;
const workConfig = require('../config/workSchedule');

var AttendanceSchema = new Schema({
  employeeID: { type: Schema.Types.ObjectId, ref: "User", required: true },
  year: { type: Number, required: true },
  month: { type: Number, required: true },
  date: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['present', 'late', 'leave', 'halfDay', 'overtime', 'remote'],
    default: 'present'
  },
  checkInTime: { type: Date },
  checkOutTime: { type: Date },
  workHours: { type: Number, default: 0 },
  overtime: { type: Number, default: 0 },
  earlyMinutes: { type: Number, default: 0 }, // Số phút đến sớm
  lateMinutes: { type: Number, default: 0 },  // Số phút đi muộn
  notes: { type: String },
  edited: { type: Boolean, default: false },
  editedBy: { type: Schema.Types.ObjectId, ref: "User" },
  editedAt: { type: Date },
  editRequest: {
    requested: { type: Boolean, default: false },
    reason: { type: String },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" }
  }
});

// Hàm chuyển đổi string time thành Date object
function parseTimeString(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

// Middleware trước khi lưu để tính toán các chỉ số
AttendanceSchema.pre('save', function(next) {
  if (this.checkInTime && this.checkOutTime) {
    // Lấy thông tin cấu hình giờ làm việc
    const workStart = parseTimeString(workConfig.workHours.start);
    const workEnd = parseTimeString(workConfig.workHours.end);
    const lateThreshold = parseTimeString(workConfig.workHours.lateThreshold);
    
    // Tính số phút đến muộn
    if (this.checkInTime > lateThreshold) {
      this.lateMinutes = Math.floor((this.checkInTime - lateThreshold) / 1000 / 60);
      this.status = 'late';
    } else if (this.checkInTime < workStart) {
      // Tính số phút đến sớm
      this.earlyMinutes = Math.floor((workStart - this.checkInTime) / 1000 / 60);
    }

    // Tính tổng số giờ làm việc
    let workMs = this.checkOutTime - this.checkInTime;
    
    // Trừ thời gian nghỉ trưa nếu làm cả ngày
    const breakStart = parseTimeString(workConfig.workHours.breakStart);
    const breakEnd = parseTimeString(workConfig.workHours.breakEnd);
    if (this.checkInTime < breakStart && this.checkOutTime > breakEnd) {
      workMs -= (breakEnd - breakStart);
    }
    
    // Chuyển đổi từ ms sang giờ
    this.workHours = parseFloat((workMs / (1000 * 60 * 60)).toFixed(2));
    
    // Tính overtime nếu làm việc quá giờ
    if (this.checkOutTime > workEnd) {
      const otMs = this.checkOutTime - workEnd;
      this.overtime = parseFloat((otMs / (1000 * 60 * 60)).toFixed(2));
      
      // Kiểm tra và giới hạn overtime theo cấu hình
      if (this.overtime > workConfig.overtime.maxDuration) {
        this.overtime = workConfig.overtime.maxDuration;
      }
      
      if (this.overtime >= workConfig.overtime.minDuration) {
        this.status = 'overtime';
      }
    }

    // Cập nhật trạng thái dựa trên số giờ làm việc
    if (this.workHours < workConfig.thresholds.minWorkHours) {
      this.status = 'leave';
    } else if (this.workHours >= workConfig.thresholds.minWorkHours && 
               this.workHours < workConfig.thresholds.fullDay) {
      this.status = 'halfDay';
    }
  }
  next();
});

// Virtual để tính số phần trăm đi làm đúng giờ
AttendanceSchema.virtual('onTimePercentage').get(function() {
  if (!this.checkInTime) return 0;
  return this.lateMinutes > 0 ? 0 : 100;
});

module.exports = mongoose.model("Attendance", AttendanceSchema);
