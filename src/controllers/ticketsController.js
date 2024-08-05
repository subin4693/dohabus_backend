const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

const Plan = require("../models/planModel");

// sample data = [
//   {
//     planId:id,
//     quantity:5,
//     date
//   }
// ]
exports.bookTicket = catchAsync(async (req, res, next) => {
  const data = req.body;

  const planTypes = await Plan.find({ _id: { $in: data.map((plan) => plan.planId) } });

  if (planTypes.length === data.length) return next(new AppError("Invalid tickets", 400));
});
exports.getTickets = catchAsync(async (req, res, next) => {});
exports.deleteTicket = catchAsync(async (req, res, next) => {});
