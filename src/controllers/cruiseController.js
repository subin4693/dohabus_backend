const Courise = require("../models/cruiseModel");

 
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
 

exports.createCourise = catchAsync(async (req, res, next) => {
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
  const newCourise = await Courise.create({ coverImage, title, description });

  res.status(201).json({
    status: "success",
    data: {
        courise: newCourise,
    },
  });
});
// Get a single hotel by ID
exports.getCourisById = catchAsync(async (req, res, next) => {
    const { id } = req.params;
  
    const courise = await Courise.findById(id);
  
    if (!courise) {
      return next(new AppError("No hotel found with that ID", 404));
    }
  
    res.status(200).json({
      status: "success",
      data: {
        courise,
      },
    });
  });
 
exports.getAllCourise = catchAsync(async (req, res, next) => {
  const courise = await Courise.find();

  res.status(200).json({
    status: "success",
    results:courise.length,
    data: {
        courise,
    },
  });
});

 
exports.deleteCourise = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const courise = await Courise.findByIdAndDelete(id);

  if (!courise) {
    return next(new AppError("No hotel found with that ID", 404));
  }

  res.status(204).json({
    status: "success",
    message: "Category deleted successfully",
    data: null,
  });
});
 
exports.updateCourise = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { coverImage, title, description } = req.body;

 
  if (!coverImage && !title && !description) {
    return next(new AppError("At least one field is required to update the hotel", 400));
  }

  const updatedCourise = await Courise.findByIdAndUpdate(
    id,
    { coverImage, title, description },
    { new: true, runValidators: true },
  );

  if (!updatedCourise) {
    return next(new AppError("No hotel found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
        courise: updatedCourise,
    },
  });
});

 
 


