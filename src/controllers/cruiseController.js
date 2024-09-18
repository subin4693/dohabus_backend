const Courise = require("../models/cruiseModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

exports.createCourise = catchAsync(async (req, res, next) => {
  const { coverImage, title, description } = req.body;

  // Log form data for debugging
  console.log("Form data received:", { coverImage, title, description });

  // Validate required fields
  if (!coverImage || !title?.en || !title?.ar || !description?.en || !description?.ar) {
    return next(
      new AppError(
        "All fields (coverImage, title in both languages, and description) are required to create a courise",
        400
      )
    );
  }

  const newCourise = await Courise.create({ coverImage, title, description });

  res.status(201).json({
    status: "success",
    message: "Courise created successfully",
    data: { courise: newCourise },
  });
});

// Get a single courise by ID
exports.getCourisById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const courise = await Courise.findById(id);

  if (!courise) {
    return next(new AppError("No courise found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Courise fetched successfully",
    data: { courise },
  });
});

// Get all courises
exports.getAllCourise = catchAsync(async (req, res, next) => {
  const courises = await Courise.find();

  res.status(200).json({
    status: "success",
    results: courises.length,
    message: "All courises retrieved successfully",
    data: { courises },
  });
});

// Delete a courise by ID
exports.deleteCourise = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const courise = await Courise.findByIdAndDelete(id);

  if (!courise) {
    return next(new AppError("No courise found with that ID", 404));
  }

  res.status(204).json({
    status: "success",
    message: "Courise deleted successfully",
    data: null,
  });
});

// Update a courise by ID
exports.updateCourise = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { coverImage, title, description } = req.body;

  // Check if at least one field is provided
  if (!coverImage && !title && !description) {
    return next(new AppError("At least one field (coverImage, title, or description) is required to update the courise", 400));
  }

  const updatedCourise = await Courise.findByIdAndUpdate(
    id,
    { coverImage, title, description },
    { new: true, runValidators: true }
  );

  if (!updatedCourise) {
    return next(new AppError("No courise found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Courise updated successfully",
    data: { courise: updatedCourise },
  });
});
