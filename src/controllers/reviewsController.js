const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const Review = require("../models/reviewsModel");

exports.getReviews = catchAsync(async (req, res, next) => {
  const { planId } = req.params;
  const reviews = await Review.find({ plan: planId }).populate("user", "name email");
  res.status(200).json({
    status: "success",
    data: reviews,
  });
});

exports.deleteReview = catchAsync(async (req, res, next) => {
  const { reviewId } = req.params;

  const review = await Review.findByIdAndDelete(reviewId);
  if (review) {
    return next(new AppError("no reviews found", 404));
  }
  return res.status(204).json({
    status: "success",
  });
});
