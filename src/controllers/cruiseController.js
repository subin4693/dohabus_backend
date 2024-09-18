const Cruise = require("../models/cruiseModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

// Create a new cruise
exports.createCruise = catchAsync(async (req, res, next) => {
  const { coverImage, title, operatorName, cruiseName, location, numberOfNights, stops, description } = req.body;

  console.log(coverImage, title, operatorName, cruiseName, location, numberOfNights, stops)

  // Check for required fields
  if (!coverImage || !title?.en || !title?.ar || !operatorName || !cruiseName || !location?.en || !location?.ar || !numberOfNights || !stops) {
    return next(new AppError("All fields, including localized strings, are required to create a cruise", 400));
  }

  // Create new cruise using the model
  const newCruise = await Cruise.create({
    coverImage,
    title,
    operatorName,
    cruiseName,
    location,
    numberOfNights,
    stops,
  });

  res.status(201).json({
    status: "success",
    data: {
      cruise: newCruise,
    },
  });
});

// Get a cruise by ID
exports.getCruiseById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Find the cruise by ID
  const cruise = await Cruise.findById(id);

  if (!cruise) {
    return next(new AppError("No cruise found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      cruise,
    },
  });
});

// Get all cruises
exports.getAllCruises = catchAsync(async (req, res, next) => {
  // Retrieve all cruises
  const cruises = await Cruise.find();

  res.status(200).json({
    status: "success",
    results: cruises.length,
    data: {
      cruises,
    },
  });
});

// Update a cruise by ID
exports.updateCruise = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { coverImage, title, operatorName, cruiseName, location, numberOfNights, stops, description } = req.body;

  // Find the cruise by ID and update it with new data
  const updatedCruise = await Cruise.findByIdAndUpdate(
    id,
    { coverImage, title, operatorName, cruiseName, location, numberOfNights, stops, description },
    { new: true, runValidators: true } // Return the updated document and validate
  );

  if (!updatedCruise) {
    return next(new AppError("No cruise found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      cruise: updatedCruise,
    },
  });
});

// Delete a cruise by ID
exports.deleteCruise = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Find the cruise by ID and delete it
  const cruise = await Cruise.findByIdAndDelete(id);

  if (!cruise) {
    return next(new AppError("No cruise found with that ID", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});
