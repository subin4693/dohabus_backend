const mongoose = require("mongoose");
const validator = require("validator");

//name, email, password, confirmPassword, photo
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter your name."],
    },
    email: {
      type: String,
      required: [true, "Please enter an email."],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, "Please enter a valid email."],
    },

    password: {
      type: String,
      // required: [true, "Please enter a password."],
      // minlength: 8,
    },
    number: {
      type: String,
      // required:[true,"Please enter a number"],
    },
    role: {
      type: String,
      enum: ["user", "admin", "super-admin"],
      default: "user",
    },
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);

module.exports = User;
