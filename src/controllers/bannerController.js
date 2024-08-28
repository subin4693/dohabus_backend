const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const banner = require("../models/bannerModel");

exports.createBanner = catchAsync(async (req, res, next) => {
  console.log(req.body);
  const newBanner = await banner.create(req.body);
  res.status(201).json({
    status: "success",
    data: {
      banner: newBanner,
    },
  });
});

exports.getBanner = catchAsync(async (req, res, next) => {
  const newBanner = await banner.find();
  res.status(201).json({
    status: "success",
    data: {
      banner: newBanner,
    },
  });
});

exports.editBanner = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  console.log(req.body);
  const updatedBanner = await banner.findByIdAndUpdate(id, req.body, {
    new: true,
  });

  if (!updatedBanner) {
    return next(new AppError("No banner found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      banner: updatedBanner,
    },
  });
});

exports.deleteBanner = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const deletedBanner = await banner.findByIdAndDelete(id);

  if (!deletedBanner) {
    return next(new AppError("No banner found with that ID", 404));
  }

  res.status(201).json({
    status: "success",
    data: null,
  });
});
