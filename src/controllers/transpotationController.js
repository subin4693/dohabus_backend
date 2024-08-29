const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const Transportation = require("../models/transportationModel");

exports.createTransportation = catchAsync(async (req, res, next) => {
  console.log("API called successfully");

  const { coverImage, title, places } = req.body;

  // Log form data for debugging
  console.log("Form data:", coverImage, title, places);

  // Check if all fields, including localized strings, are provided
  if (!coverImage || !title?.en || !title?.ar || !places) {
    return next(
      new AppError(
        "All fields, including localized strings, are required to create a transportaton",
        400,
      ),
    );
  }

  // Create a new transportation document
  const newTransportation = await Transportation.create({
    coverImage,
    title,
    places,
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
  console.log("Transportations:", transportations);

  res.status(200).json({
    status: "success",
    data: {
      transportations,
    },
  });
});
exports.getAdminTransportations = catchAsync(async (req, res, next) => {
  const transportations = await Transportation.find(); // Fetch all transportation categories
  console.log("Transportations:", transportations);

  res.status(200).json({
    status: "success",
    data: {
      transportations,
    },
  });
});

exports.deleteTransportation = catchAsync(async (req, res, next) => {
  console.log("Delete Transportation API called");
  const { id } = req.params; // Extract the ID from the request parameters
  console.log("Transportation ID to delete:", id);

  const deletedTransportation = await Transportation.findByIdAndDelete(id); // Delete the transportation by ID

  if (!deletedTransportation) {
    const error = new AppError("No transportation found with that ID", 404);
    return next(error);
  }

  console.log("Deletion of transportation completed");
  res.status(200).json({
    status: "success",
    message: "Transportation deleted successfully",
    data: null,
  });
});
exports.editTransportation = catchAsync(async (req, res, next) => {
  const { id } = req.params; // Extract the ID from the request parameters
  const { coverImage, title, places } = req.body; // Extract relevant fields from the request body

  console.log("ID from params:", id);
  console.log("Request body:", { coverImage, title, places });

  if (!coverImage || !title?.en || !title?.ar || !places) {
    return next(
      new AppError(
        "Cover image, title (in both languages), and places (in both languages) are required to update a transportation",
        400,
      ),
    );
  }

  const updatedTransportation = await Transportation.findByIdAndUpdate(
    id,
    { coverImage, title, places }, // Update fields: cover image, title, and places
    { new: true, runValidators: true },
  );

  console.log("Updated transportation data:", updatedTransportation);

  if (!updatedTransportation) {
    return next(new AppError("No transportation found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      transportation: updatedTransportation,
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
