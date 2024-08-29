const Hotel = require("../models/hotelModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

// Create a new hotel
exports.createHotel = catchAsync(async (req, res, next) => {
  const { coverImage, title, description } = req.body;
  console.log("Form data here!!!", coverImage, title, description);
  if (!coverImage || !title?.en || !title?.ar || !description?.en || !description?.ar) {
    return next(
      new AppError(
        "All fields, including localized strings, are required to create a category",
        400,
      ),
    );
  }
  console.log("Erro2");
  const newHotel = await Hotel.create({ coverImage, title, description });

  res.status(201).json({
    status: "success",
    data: {
      hotel: newHotel,
    },
  });
});

// Get all hotels
exports.getAllHotels = catchAsync(async (req, res, next) => {
  const hotels = await Hotel.find();

  res.status(200).json({
    status: "success",
    results: hotels.length,
    data: {
      hotels,
    },
  });
});

// Delete a hotel
exports.deleteHotel = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const hotel = await Hotel.findByIdAndDelete(id);

  if (!hotel) {
    return next(new AppError("No hotel found with that ID", 404));
  }

  res.status(204).json({
    status: "success",
    message: "Category deleted successfully",
    data: null,
  });
});

// Update an existing hotel
exports.updateHotel = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { coverImage, title, description } = req.body;

  // Ensure at least one field is provided to update
  if (!coverImage && !title && !description) {
    return next(new AppError("At least one field is required to update the hotel", 400));
  }

  const updatedHotel = await Hotel.findByIdAndUpdate(
    id,
    { coverImage, title, description },
    { new: true, runValidators: true },
  );

  if (!updatedHotel) {
    return next(new AppError("No hotel found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      hotel: updatedHotel,
    },
  });
});

// Get a single hotel by ID
exports.getHotelById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const hotel = await Hotel.findById(id);

  if (!hotel) {
    return next(new AppError("No hotel found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      hotel,
    },
  });
});
