const location = require("../models/locationModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.createLocation = catchAsync(async (req, res, next) => {
  const newLocation = await location.create(req.body);
  res.status(201).json({
    status: "success",
    data: {
      location: newLocation,
    },
  });
});

exports.getAllLocation = catchAsync(async (req, res, next) => {
  const locations = await location.find();
  res.status(200).json({
    status: "success",
    results: locations.length,
    data: {
      locations,
    },
  });
});

exports.deleteLocation = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const deletedLocation = await location.findByIdAndDelete(id);

  if (!deletedLocation) {
    return next(new AppError("No location found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
  });
});

exports.editLocation = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const updatedLocation = await location.findByIdAndUpdate(id, req.body, {
    new: true,
  });

  if (!updatedLocation) {
    return next(new AppError("No location found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      location: updatedLocation,
    },
  });
});
