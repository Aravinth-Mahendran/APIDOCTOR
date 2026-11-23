
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false
    },
    passwordResetToken: {
  type: String,
  select: false
},

passwordResetExpires: {
  type: Date,
  select: false
},
tokenVersion: {
  type: Number,
  default: 0
},
isEmailVerified: {
  type: Boolean,
  default: false
},

emailVerificationToken: {
  type: String,
  select: false
},

emailVerificationExpires: {
  type: Date,
  select: false
}
  },
  
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);
