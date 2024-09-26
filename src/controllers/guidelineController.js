const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

const GuideLine = require("../models/guidelineModel");

exports.createGuideline = catchAsync(async (req, res, next) => {
  const data = req.body.data;
  console.log(data);
  const response = await GuideLine.create({ text: data });
  console.log(response);
  return res.status(201).json({ message: "success", data: response });
});

exports.getGuideline = catchAsync(async (req, res, next) => {
  const response = await GuideLine.findOne();
  return res.status(200).json({ message: "success", data: response });
});

exports.editGuideline = catchAsync(async (req, res, next) => {
  const { data } = req.body;
  const { id: guideLineId } = req.params;

  if (!data) {
    return res.status(400).json({ message: "No data provided" });
  }

  try {
    // Update the guideline and return the updated document
    const updatedGuideLine = await GuideLine.findByIdAndUpdate(
      guideLineId,
      { text: data },
      { new: true, runValidators: true }, // 'new: true' returns the updated document
    );

    if (!updatedGuideLine) {
      return res.status(404).json({ message: "GuideLine not found" });
    }

    return res.status(200).json({ message: "Success", data: updatedGuideLine });
  } catch (error) {
    return res.status(500).json({ message: "An error occurred", error: error.message });
  }
});
