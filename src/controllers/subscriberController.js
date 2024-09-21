const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const Subscriber = require("../models/subscribersModel");

// Create a new subscriber
exports.createSubscriber = catchAsync(async (req, res, next) => {
  const { name, email } = req.body;

  const existingSubscriber = await Subscriber.findOne({ email });

  if (existingSubscriber) {
    return next(new AppError("Email already exists", 400));
  }

  const newSubscriber = await Subscriber.create({ name, email });

  res.status(201).json({
    status: "success",
    data: {
      subscriber: newSubscriber,
    },
  });
});

// Get all subscribers
exports.getAllSubscribers = catchAsync(async (req, res, next) => {
  const subscribers = await Subscriber.find();

  res.status(200).json({
    status: "success",
    data: {
      subscribers,
    },
  });
});

// Edit a subscriber
exports.editSubscriber = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const updatedSubscriber = await Subscriber.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!updatedSubscriber) {
    return next(new AppError("No subscriber found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      subscriber: updatedSubscriber,
    },
  });
});

// Delete a subscriber
exports.deleteSubscriber = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const deletedSubscriber = await Subscriber.findByIdAndDelete(id);

  if (!deletedSubscriber) {
    return next(new AppError("No subscriber found with that ID", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});
