const jwt = require("jsonwebtoken");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const User = require("../models/userModel");
const bcryptjs = require("bcryptjs");
const dotenv = require("dotenv");
dotenv.config();

exports.signup = catchAsync(async (req, res, next) => {
  const { email, name, password, number } = req.body;

  const hashed = await bcryptjs.hash(password, 8);

  const newUser = await User.create({ email, name, password: hashed, number });
  const token = jwt.sign(
    { id: newUser._id, role: newUser.role, email: newUser.email },
    process.env.JWT_SECRECT,
    {
      expiresIn: process.env.LOGIN_EXPIRES,
    },
  );

  newUser.password = undefined;
  // var expirationDate = new Date();
  // expirationDate.setDate(expirationDate.getDate() + 30);

  // res.cookie("token", "bearer " + token);

  res.status(201).json({
    status: "success",

    data: {
      user: newUser,
    },
  });
});

exports.signin = catchAsync(async (req, res, next) => {
  console.log("sicnin reived");
  const email = req.body.email;
  const password = req.body.password;
  console.log(email, password);

  if (!email || !password) {
    const error = new AppError("Please enter mail id and password for login", 400);
    return next(error);
  }

  const user = await User.findOne({ email });
  console.log(user);

  if (!user) {
    const error = new AppError("User not found", 400);
    return next(error);
  }

  const match = await bcryptjs.compare(password, user.password);

  if (!match) {
    const error = new AppError("Please enter a correct email or password", 400);
    return next(error);
  }
  user.password = undefined;
  // const token = jwt.sign(
  //   { id: user._id, role: user.role, email: user.email },
  //   process.env.JWT_SECRECT,
  //   {
  //     expiresIn: process.env.LOGIN_EXPIRES,
  //   },
  // );

  // var expirationDate = new Date();
  // expirationDate.setDate(expirationDate.getDate() + 30);

  // res.cookie("token", "bearer " + token);

  res.status(201).json({
    status: "success",

    data: {
      user,
    },
  });
});

exports.signout = catchAsync(async (req, res, next) => {
  res.clearCookie("token");

  res.status(200).json({
    status: "success",
    message: "User successfully signed out.",
  });
});

exports.verify = catchAsync(async (req, res, next) => {
  // const userId = req.user.id;
  // // Find the user and exclude the password
  // const user = await User.findById(userId).select("-password");
  // // Create a new object with user.id instead of user._id
  // const responseUser = {
  //   id: user.id, // Use user.id
  //   // Add other properties you want to include here
  //   // For example:
  //   name: user.name,
  //   email: user.email,
  //   role: user.role,
  //   number:user.number
  //   // ...other properties
  // };
  // res.status(200).json({
  //   status: "success",
  //   data: {
  //     user: responseUser,
  //   },
  // });
});

exports.SigninWithGoogle = catchAsync(async (req, res, next) => {
  console.log("Goooooogle");
  const data = req.body;
  console.log(data.fields.email);

  const user = await User.findOne({ email: data.fields.email });

  try {
    if (!user) {
      const newUser = await User.create({
        email: data.fields.email,
        name: data.fields.name,
        number: data.fields.phone,
      });
      const token = jwt.sign(
        { id: newUser._id, role: newUser.role, email: newUser.email },
        process.env.JWT_SECRECT,
        {
          expiresIn: process.env.LOGIN_EXPIRES,
        },
      );

      newUser.password = undefined;

      res.cookie("token", "bearer " + token);

      res.status(201).json({
        status: "success",

        data: {
          user: newUser,
        },
      });
    } else {
      const user = await User.findOne({ email: data.fields.email });
      const token = jwt.sign(
        { id: user._id, role: user.role, email: user.email },
        process.env.JWT_SECRECT,
        {
          expiresIn: process.env.LOGIN_EXPIRES,
        },
      );

      res.cookie("token", "bearer " + token);

      res.status(201).json({
        status: "success",

        data: {
          user,
        },
      });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).json({
      status: "Failed",
    });
  }
});
