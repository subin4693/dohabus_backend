const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const Aboutus = require("../models/aboutusModel");

exports.createAbout = catchAsync(async (req, res, next) => {
  const data = req.body;
  data.text = req.body.about;
  const newAboutUs = await Aboutus.create(data);

  res.status(201).json({
    status: "success",
    aboutus: newAboutUs,
  });
});

exports.getAboutus = catchAsync(async (req, res, next) => {
  const aboutUsEntries = await Aboutus.find();
  res.status(200).json({
    status: "success",
    aboutus: aboutUsEntries,
  });
});

exports.editAboutus = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const data = req.body;
  data.text = req.body.about;
  const updatedAboutUs = await Aboutus.findByIdAndUpdate(id, data, {
    new: true,
  });
  if (!updatedAboutUs) {
    throw new Error("About Us entry not found");
  }
  res.status(200).json({
    status: "success",
    aboutus: updatedAboutUs,
  });
});
