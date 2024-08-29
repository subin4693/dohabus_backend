const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const Review = require("../models/reviewsModel");
const Ticket = require("../models/ticketModel");

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

exports.createReview = catchAsync(async (req, res, next) => {
  const { planId } = req.params; // Extract planId from URL parameters
  const userId = req.user ? req.user.id : null; // Extract userId from the request user object
  const { reviewText, imageURL } = req.body; // Extract review details from request body

  if (!userId) {
    return next(new AppError("User must be logged in to submit a review", 401));
  }

  // Check if the user has a booked ticket for the plan
  const ticket = await Ticket.findOne({
    user: userId,
    plan: planId,
    status: "Booked",
    date: { $lt: Date.now() },
  });

  if (!ticket) {
    return next(new AppError("You must have a valid ticket to submit a review", 403));
  }

  // Create and save the review
  const review = await Review.create({
    user: userId,
    plan: planId,
    reviewText,
    imageURL,
  });
  const populatedReview = await Review.findById(review._id).populate("user", "name email");

  res.status(201).json({
    status: "success",
    data: {
      populatedReview,
    },
  });
});
