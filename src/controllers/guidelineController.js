const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

const GuideLine = require("../models/guidelineModel");

// Create a new guideline
exports.createGuideline = catchAsync(async (req, res, next) => {
  console.log("called")
  const { data } = req.body; // Destructure heading and points from request body
  console.log(data
  )
  if (!data?.heading || !data?.points) {
    return res.status(400).json({ message: "Heading and points are required" });
  }

  const response = await GuideLine.create({ heading: data?.heading, points: data?.points });
  return res.status(201).json({ message: "Success", data: response });
});

// Get a guideline
exports.getGuideline = catchAsync(async (req, res, next) => {
  const response = await GuideLine.find();
  if (!response) {
    return res.status(404).json({ message: "GuideLine not found" });
  }
  return res.status(200).json({ message: "Success", data: response });
});
exports.guiddelete = catchAsync(async (req, res, next) => {
  const { id } = req.params; // Extract the ID from the request parameters

  // Check if the guideline exists
  const guideline = await GuideLine.findById(id);
  if (!guideline) {
    return res.status(404).json({ message: "GuideLine not found" });
  }

  // Delete the guideline
  await GuideLine.findByIdAndDelete(id);

  return res.status(200).json({ message: "GuideLine deleted successfully" });
});


// Edit an existing guideline
exports.editGuideline = catchAsync(async (req, res, next) => {
  console.log("d")
  const { data } = req.body; // Destructure heading and points from request body
  console.log(data);

  const { id: guideLineId } = req.params;

  if (!data?.heading && !data?.points) {
    return res.status(400).json({ message: "No data provided for update" });
  }

  console.log("done");

  try {
    // Update the guideline with heading and points
    const updatedGuideLine = await GuideLine.findByIdAndUpdate(
      guideLineId,
      { heading: data?.heading, points: data?.points },
      { new: true, runValidators: true } // 'new: true' returns the updated document
    );
    console.log("heading, points, id");


    if (!updatedGuideLine) {
      return res.status(404).json({ message: "GuideLine not found" });
    }

    console.log("heading, points, id");

    return res.status(200).json({ message: "Success", data: updatedGuideLine });
  } catch (error) {
    return res.status(500).json({ message: "An error occurred", error: error.message });
  }
});
