var mongoose = require("mongoose");
var bcrypt = require("bcrypt-nodejs");
require("mongoose-type-email");
var Schema = mongoose.Schema;


var UserSchema = new Schema({
  type: { type: String },
  email: { type: mongoose.SchemaTypes.Email, required: true, unique: true },
  password: { type: String, required: true },
  firstName: {
    type: String,
    required: true,
    maxlength: 50,
    match: /^[A-Za-zÀ-ỹ\s]+$/,
    set: v => v.charAt(0).toUpperCase() + v.slice(1).trim()
  },
  lastName: {
    type: String,
    required: true,
    maxlength: 50,
    match: /^[A-Za-zÀ-ỹ\s]+$/,
    set: v => v.charAt(0).toUpperCase() + v.slice(1).trim()
  },
  name: {
    type: String,
    maxlength: 100,
    set: v => v ? v.charAt(0).toUpperCase() + v.slice(1).trim() : '',
    required: true
  },
  dateOfBirth: {
    type: Date,
    required: true,
    validate: {
      validator: function (dob) {
        const age = new Date().getFullYear() - dob.getFullYear();
        return age >= 18 && age <= 60 && dob.getFullYear() >= 1965;
      },
      message: 'Age must be between 18–60 and year ≥ 1965'
    }
  },
  contactNumber: {
    type: String,
    required: true,
    match: /^(0|\+84)(\d{9,10})$/
  },
  personalEmail: {
    type: mongoose.SchemaTypes.Email,
    required: false,
    unique: false,
    lowercase: true,
    trim: true
  },
  position: { type: String, required: true },
  department: { type: String, required: true },
  gender: { type: String, enum: ['Male', 'Female'], required: true },
 
  birthplace: {
    city: { type: String, required: true }
  },
  address: {
    city: { type: String, required: true },
    district: { type: String, required: true },
    details: {
      type: String,
      required: true,
      minlength: 10,
      match: /^[\p{L}0-9\s,./\-]+$/u
    }
  },
  idNumber: {
    type: String,
    required: true,
    unique: true,
    match: /^\d{12}$/
  },
  jobTitle: {
    type: String,
    required: true,
    maxlength: 100,
    match: /^[A-Za-zÀ-ỹ\s]+$/
  },
  jobId: {
    type: String,
    required: true,
    unique: true,
    match: /^[A-Z]{3}\d{3}$/
  },
  workExperience: {
    type: String,
    enum: ['Fresher', 'Junior', 'Senior'],
  },
  supervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    validate: {
      validator: function (v) {
        return this._id !== v;
      },
      message: "Supervisor cannot be self."
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  profileImage: {
    type: String,
    default: ''
  },
  employmentType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Intern'],
    required: true
  },
  startDate: {
    type: Date,
    required: true,
    validate: {
      validator: function (d) {
        return d <= new Date();
      },
      message: 'Start date cannot be in the future'
    }
  },
  Skills: [String],
  designation: String,
  dateAdded: { type: Date },
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, {
  timestamps: true
});


UserSchema.methods.encryptPassword = function (password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(5), null);
};


UserSchema.methods.validPassword = function (password) {
  return bcrypt.compareSync(password, this.password);
};
module.exports = mongoose.model("User", UserSchema);



