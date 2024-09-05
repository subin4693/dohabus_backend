const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const Category = require("../models/categoryModel");
const Plan = require("../models/planModel");
const Cart = require("../models/cartModel");
const Favourite = require("../models/favouritesModel");
const Ticket = require("../models/ticketModel");

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
    isPickupRequired,
    isDropOffRequired,
    addOn,
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
    isPickupRequired,
    isDropOffRequired,
    addOn,
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
    isPickupRequired,
    isDropOffRequired,
    addOn,
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
      isPickupRequired,
      isDropOffRequired,
      addOn,
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
  const userId = req?.user ? req?.user?.id : null; // Get the user ID if available

  const plan = await Plan.findOne({ _id: id, isActive: true });

  if (!plan) {
    return next(new AppError("No plan found with that ID", 404));
  }

  let canWriteReview = false; // Default to false

  if (userId) {
    // Check if the user has a booked ticket for the plan with a future date
    const ticket = await Ticket.findOne({
      user: userId,
      plan: id,
      status: "Booked",
      date: { $lt: Date.now() },
    });
    console.log(ticket);

    if (ticket) {
      canWriteReview = true; // Set to true if such a ticket is found
    }
  }

  res.status(200).json({
    status: "success",
    data: {
      plan,
      canWriteReview, // Add this field to the response
    },
  });
});

// Get plans by category ID
exports.getPlanByCategory = catchAsync(async (req, res, next) => {
  console.log(req.params);
  console.log(req.user);

  const { categoryId } = req.params;
  const userId = req.user ? req.user.id : null;

  // Retrieve active plans and category
  const plansQuery = Plan.find({ category: categoryId, isActive: true });
  const categoryQuery = Category.findById(categoryId);

  // Initialize arrays for cart and favorites
  let cartItems = [];
  let favoriteItems = [];

  if (userId) {
    // Retrieve cart and favorite items with their IDs
    cartItems = await Cart.find({ user: userId }).select("tour _id"); // Select tour and cart ID
    favoriteItems = await Favourite.find({ user: userId }).select("tour _id"); // Select tour and fav ID
  }

  const [plans, category] = await Promise.all([plansQuery, categoryQuery]);

  // If no plans found, return an error
  if (!plans || plans.length === 0) {
    return res.status(200).json({
      status: "success",
      data: {
        category,
        plans: [],
      },
    });
  }

  // Map plan IDs to their respective cart and favorite IDs
  const cartMap = new Map(cartItems.map((item) => [item.tour.toString(), item._id.toString()]));
  const favMap = new Map(favoriteItems.map((item) => [item.tour.toString(), item._id.toString()]));

  const updatedPlans = plans.map((plan) => {
    const planIdStr = plan._id.toString();
    console.log("lan str:");
    console.log(planIdStr);
    favid = favMap.get(planIdStr);
    console.log("fabic: " + favid);
    return {
      ...plan._doc,
      isInCart: cartMap.has(planIdStr),
      isInFavorites: favMap.has(planIdStr),
      cartId: cartMap.get(planIdStr) || null,
      favId: favMap.get(planIdStr) || null,
    };
  });
  console.log(updatedPlans);

  res.status(200).json({
    status: "success",
    data: {
      category,
      plans: updatedPlans,
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
exports.getAllPlanNames = catchAsync(async (req, res, next) => {
  try {
    const plans = await Plan.find().select("title");
    res.status(200).json({
      status: "success",
      data: {
        plans,
      },
    });
  } catch (error) {
    next(error);
  }
});
