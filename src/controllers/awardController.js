const footer = require("../models/awardsModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.getFooterImages = catchAsync(async (req, res, next) => {
  const images = await footer.find();

  if (!images) return next(new AppError("There is no images found", 404));

  res.status(200).json({
    status: "success",
    images,
  });
});

exports.createNewFooterImage = catchAsync(async (req, res, next) => {
  const image = req.body.imageUrl;

  const iiimage = await footer.create({ image });

  res.status(201).json({ status: "success", iiimage });
});

exports.deletetFooterImages = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  await footer.findByIdAndDelete(id);

  res.status(200).json({ status: "success" });
});

exports.editFooterImage = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const resposne = await footer.findByIdAndUpdate(id, { image: req.body.imageUrl }, { new: true });
  res.status(200).json({ status: "success", resposne });
});
