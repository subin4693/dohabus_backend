const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const Plan = require("../models/planModel");

// Create a new plan

exports.createNewPlans = catchAsync(async (req, res, next) => {
  const {
    category,
    coverImage,
    title,
    duration,
    typeOfTour,
    transportation,
    language,
    description,
    highlights,
    includes,
    itinerary,
    knowBeforeYouGo,
    faq,
    galleryImages,
    galleryVideos,
    availableDays,
    selectedSessions,
    adultPrice,
    childPrice,
    isActive,
  } = req.body.formData;

  // Validate required fields
  const requiredFields = [
    { name: "category", value: category },
    { name: "coverImage", value: coverImage },
    { name: "title", value: title },
    { name: "duration", value: duration },
    { name: "typeOfTour", value: typeOfTour },
    { name: "transportation", value: transportation },
    { name: "language", value: language },
    { name: "description", value: description },
    { name: "highlights", value: highlights },
    { name: "includes", value: includes },
    { name: "itinerary", value: itinerary },
    { name: "galleryImages", value: galleryImages },
    { name: "galleryVideos", value: galleryVideos },
    { name: "availableDays", value: availableDays },
    { name: "selectedSessions", value: selectedSessions },
    { name: "adultPrice", value: adultPrice },
    { name: "childPrice", value: childPrice },
  ];

  for (const field of requiredFields) {
    if (
      field.value === undefined ||
      field.value === null ||
      (Array.isArray(field.value) && field.value.length === 0) ||
      (typeof field.value === "string" && field.value.trim() === "")
    ) {
      return next(new AppError(`Field ${field.name} is required`, 400));
    }
  }

  // Create the plan
  const newPlan = await Plan.create({
    category,
    coverImage,
    title,
    duration,
    typeOfTour,
    transportation,
    language,
    description,
    highlights,
    includes,
    itinerary,
    knowBeforeYouGo,
    faq,
    galleryimages: galleryImages,
    galleryvideos: galleryVideos,
    availableDays,
    sessions: selectedSessions,
    adultPrice,
    childPrice,
  });

  res.status(201).json({
    status: "success",
    data: {
      plan: newPlan,
    },
  });
});

exports.getAllPlans = catchAsync(async (req, res, next) => {
  const plans = await Plan.find({ isActive: true });

  res.status(200).json({
    status: "success",
    results: plans.length,
    data: {
      plans,
    },
  });
});

// Delete a plan by ID
exports.deletePlan = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const plan = await Plan.findByIdAndDelete(id);

  if (!plan) {
    return next(new AppError("No plan found with that ID", 404));
  }

  res.status(204).json({
    status: "success",
    message: "Plan deleted successfully",
    data: null,
  });
});

// Update a plan by ID
exports.editPlan = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const {
    category,
    coverImage,
    title,
    duration,
    typeOfTour,
    transportation,
    language,
    description,
    highlights,
    includes,
    itinerary,
    knowBeforeYouGo,
    faq,
    galleryImages,
    galleryVideos,
    availableDays,
    selectedSessions,
    adultPrice,
    childPrice,
    isActive,
  } = req.body.formData;

  // Validate required fields
  const requiredFields = [
    { name: "category", value: category },
    { name: "coverImage", value: coverImage },
    { name: "title", value: title },
    { name: "duration", value: duration },
    { name: "typeOfTour", value: typeOfTour },
    { name: "transportation", value: transportation },
    { name: "language", value: language },
    { name: "description", value: description },
    { name: "highlights", value: highlights },
    { name: "includes", value: includes },
    { name: "itinerary", value: itinerary },
    { name: "galleryImages", value: galleryImages },
    { name: "galleryVideos", value: galleryVideos },
    { name: "availableDays", value: availableDays },
    { name: "selectedSessions", value: selectedSessions },
    { name: "adultPrice", value: adultPrice },
    { name: "childPrice", value: childPrice },
  ];

  for (const field of requiredFields) {
    if (
      field.value === undefined ||
      field.value === null ||
      (Array.isArray(field.value) && field.value.length === 0) ||
      (typeof field.value === "string" && field.value.trim() === "")
    ) {
      return next(new AppError(`Field ${field.name} is required`, 400));
    }
  }

  // Update the plan
  const updatedPlan = await Plan.findByIdAndUpdate(
    id,
    {
      category,
      coverImage,
      title,
      duration,
      typeOfTour,
      transportation,
      language,
      description,
      highlights,
      includes,
      itinerary,
      knowBeforeYouGo,
      faq,
      galleryimages: galleryImages,
      galleryvideos: galleryVideos,
      availableDays,
      sessions: selectedSessions,
      adultPrice,
      childPrice,
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!updatedPlan) {
    return next(new AppError("No plan found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      plan: updatedPlan,
    },
  });
});

// Get a single plan by ID
exports.getSinglePlan = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const plan = await Plan.findById(id);

  if (!plan) {
    return next(new AppError("No plan found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      plan,
    },
  });
});

// Get plans by category ID
exports.getPlanByCategory = catchAsync(async (req, res, next) => {
  const { categoryId } = req.params;

  const plans = await Plan.find({ category: categoryId });

  if (!plans || plans.length === 0) {
    return next(new AppError("No plans found for this category", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      plans,
    },
  });
});
exports.switchActive = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Find the plan by ID
  const plan = await Plan.findById(id);

  if (!plan) {
    return res.status(404).json({
      status: "fail",
      message: "Plan not found",
    });
  }

  // Toggle the isActive field
  plan.isActive = !plan.isActive;

  // Save the updated plan
  await plan.save();

  res.status(200).json({
    status: "success",
    data: {
      plan,
    },
  });
});
