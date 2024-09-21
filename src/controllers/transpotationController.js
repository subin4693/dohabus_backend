const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const Transportation = require("../models/transportationModel");

exports.createTransportation = catchAsync(async (req, res, next) => {
  const { coverImage, title, type, other, passenger, luggage, isActive } = req.body;

  // Log form data for debugging

  // Check if all fields, including localized strings, are provided
  if (
    !coverImage ||
    !title?.en ||
    !title?.ar ||
    !type?.en ||
    !type?.ar ||
    !other?.en ||
    !other?.ar ||
    !passenger ||
    !luggage
  ) {
    return next(
      new AppError(
        "All fields, including localized strings, are required to create a transportation",
        400,
      ),
    );
  }

  // Create a new transportation document
  const newTransportation = await Transportation.create({
    coverImage,
    title,
    type,
    other,
    passenger,
    luggage,
    isActive,
  });

  // Send a response back to the client
  res.status(201).json({
    status: "success",
    data: {
      transportation: newTransportation,
    },
  });
});

exports.getTransportations = catchAsync(async (req, res, next) => {
  const transportations = await Transportation.find({ isActive: true }); // Fetch all transportation categories

  res.status(200).json({
    status: "success",
    data: {
      transportations,
    },
  });
});

exports.getAdminTransportations = catchAsync(async (req, res, next) => {
  const transportations = await Transportation.find(); // Fetch all transportation categories

  res.status(200).json({
    status: "success",
    data: {
      transportations,
    },
  });
});

exports.deleteTransportation = catchAsync(async (req, res, next) => {
  const { id } = req.params; // Extract the ID from the request parameters

  const deletedTransportation = await Transportation.findByIdAndDelete(id); // Delete the transportation by ID

  if (!deletedTransportation) {
    const error = new AppError("No transportation found with that ID", 404);
    return next(error);
  }

  res.status(200).json({
    status: "success",
    message: "Transportation deleted successfully",
    data: null,
  });
});

exports.editTransportation = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const updateFields = req.body;

  const transportation = await Transportation.findByIdAndUpdate(id, updateFields, {
    new: true,
    runValidators: true,
  });

  if (!transportation) {
    return next(new AppError("Transportation not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      transportation,
    },
  });
});

exports.switchTransportation = catchAsync(async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find the transportation by ID
    const transportation = await Transportation.findById(id);

    if (!transportation) {
      return res.status(404).json({ message: "Transportation not found" });
    }

    // Toggle the isActive field
    transportation.isActive = !transportation.isActive;

    // Save the updated transportation
    await transportation.save();

    // Respond with the updated transportation
    res.status(200).json({
      message: "Transportation active status updated successfully",
      data: transportation,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
