const TermsAndConditions = require("../models/termsAndConditionModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.createTermsAndCundtions = catchAsync(async (req, res, next) => {
  const { text } = req.body;
  if (!text) {
    throw new AppError("Please provide a valid text", 400);
  }
  const termsAndConditions = await TermsAndConditions.create({ text });
  res.status(201).json({ status: "success", termsAndConditions });
});

exports.getTermsAndCunditions = catchAsync(async (req, res, next) => {
  const termsAndCondition = await TermsAndConditions.findOne();
  res.status(200).json({ status: "success", termsAndCondition });
});

exports.editTermsAndCunditionsById = catchAsync(async (req, res, next) => {
  const id = req.params.id;
  const { text } = req.body;
  const termsAndCondition = await TermsAndConditions.findByIdAndUpdate(
    id,
    { text: text },
    { new: true },
  );
  res.status(200).json({
    status: "success",
    termsAndCondition,
  });
});
