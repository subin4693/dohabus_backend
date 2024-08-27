const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const banner = require("../models/bannerModel");

exports.createOffer = catchAsync(async (req, res, next) => {
  const newOffer = await Offer.create(req.body);
  res.status(201).json({
    status: "success",
    data: {
      offer: newOffer,
    },
  });
});

exports.getOffer = catchAsync(async (req, res, next) => {
  const offers = await Offer.find();
  res.status(200).json({
    status: "success",
    results: offers.length,
    data: {
      offers,
    },
  });
});

exports.editOffer = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const updatedOffer = await Offer.findByIdAndUpdate(id, req.body, {
    new: true, // Return the updated document
    runValidators: true, // Run schema validations
  });

  if (!updatedOffer) {
    return next(new AppError("No offer found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      offer: updatedOffer,
    },
  });
});

exports.deleteOffer = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const deletedOffer = await Offer.findByIdAndDelete(id);

  if (!deletedOffer) {
    return next(new AppError("No offer found with that ID", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});
