const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const TransBooking = require("../models/booktransportation");

exports.createBooking = catchAsync(async (req, res, next) => {
  console.log("Starting transportation booking process");
  const userId = req.body.user ? req.body.user._id : null; // Get the user ID from the request

  console.log("User ID:", userId);

  const {
    transId,
    checkInDate,
    numberOfAdults,
    numberOfChildren,
    additionalRequest,
    email,
    name,
  } = req.body;
  console.log(
    transId,
    checkInDate,
    numberOfAdults,
    numberOfChildren,
    additionalRequest,
    email,
    name,
  );

  console.log("Received booking data");

  // Create booking object with or without userId
  const newBookingData = {
    transId: transId, // Replace `hotelId` with `transportationId`
    date: checkInDate,
    numberOfAdults,
    numberOfChildren,
    additionalRequest,
    email,
    name,
  };
  console.log(newBookingData);
  if (userId) {
    newBookingData.userId = userId;
  }

  const newBooking = await TransBooking.create(newBookingData);

  console.log("Transportation booking created successfully");

  // Respond with the created booking
  res.status(201).json({
    status: "success",
    data: {
      booking: newBooking,
    },
  });
});

// Get all transportation bookings
exports.getAllBookings = catchAsync(async (req, res, next) => {
  const bookings = await TransBooking.find().populate("userId transId");
  res.status(200).json({
    status: "success",
    data: {
      bookings,
    },
  });
});

// Get booking by ID
exports.getBookingById = catchAsync(async (req, res, next) => {
  const booking = await TransBooking.findById(req.params.id).populate("userId transId");
  if (!booking) {
    return next(new AppError("Booking not found", 404));
  }
  res.status(200).json({
    status: "success",
    data: {
      booking,
    },
  });
});

// Update a booking
exports.updateBooking = catchAsync(async (req, res, next) => {
  const updatedBooking = await TransBooking.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!updatedBooking) {
    return next(new AppError("Booking not found", 404));
  }
  res.status(200).json({
    status: "success",
    message: "Booking updated successfully",
    data: {
      booking: updatedBooking,
    },
  });
});

// Delete a booking
exports.deleteBooking = catchAsync(async (req, res, next) => {
  const booking = await TransBooking.findByIdAndDelete(req.params.id);
  if (!booking) {
    return next(new AppError("Booking not found", 404));
  }
  res.status(200).json({
    status: "success",
    message: "Booking deleted successfully",
  });
});
