const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.addToCart = catchAsync(async (req, res, next) => {});
exports.getCart = catchAsync(async (req, res, next) => {
  console.log(req.user);
});
exports.removeFromCart = catchAsync(async (req, res, next) => {});
