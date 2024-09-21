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

exports.getAllReviews = catchAsync(async (req, res, next) => {
  const reviews = await Review.find({ imageURL: { $exists: true, $ne: null } }) // Filter reviews that have an imageURL
    .populate({
      path: "user",
      select: "name email",
    })
    .populate({
      path: "plan",
      select: "title",
    });

  return res.status(200).json({
    status: "success",
    data: reviews,
  });
});

exports.deleteReview = catchAsync(async (req, res, next) => {
  const { reviewId } = req.params;
  // const user = req.body.user._id;
  // if (!user) {
  //   return next(new AppError("User ID is required", 400));
  // }
  // const user = req.query.user != "undefined" ? req?.query?.user : null;
  // const user = req.query.user;
  const review = await Review.findById(reviewId);

  if (!review) {
    return next(new AppError("Review not found", 404));
  }
  // if (review.user.toString() !== user) {
  //   return next(new AppError("You are not authorized to delete this review", 403));
  // }
  await Review.findByIdAndDelete(reviewId);
  return res.status(204).json({
    status: "success",
  });
});

exports.createReview = catchAsync(async (req, res, next) => {
  const { planId } = req.params; // Extract planId from URL parameters
  // const userId = req.query.user != "undefined" ? req.query.user : null;
  // const userId = req.body.user ? req.body.user._id : null; // Extract userId from the request user object
  const { reviewText, imageURL, user } = req.body; // Extract review details from request body
  const userId = user?._id;
  const email = user?.email;
  if (!userId || !email) {
    return next(new AppError("User must be logged in to submit a review", 401));
  }

  // Check if the user has a booked ticket for the plan
  const ticket = await Ticket.findOne({
    email: email,
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
