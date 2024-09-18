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
    adultData,
    childData,
    limit,
    stopSales,
  } = req.body;

  console.log(category);
  console.log(req.body);
  // Validate required fields
  const requiredFields = [
    { name: "category", value: category },
    { name: "coverImage", value: coverImage },
    { name: "title", value: title },
    { name: "description", value: description },
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
  const hasAdultPrice = adultPrice !== undefined && adultPrice !== null && adultPrice !== "";
  const hasChildPrice = childPrice !== undefined && childPrice !== null && childPrice !== "";
  const hasAdultData =
    adultData && adultData.some((row) => Number(row.pax) > 0 || Number(row.price) > 0);
  const hasChildData =
    childData && childData.some((row) => Number(row.pax) > 0 || Number(row.price) > 0);

  if ((hasAdultPrice || hasChildPrice) && (hasAdultData || hasChildData)) {
    return next(
      new AppError("Provide either single price fields or detailed pricing data, not both.", 400),
    );
  }

  if ((hasAdultPrice && !hasChildPrice) || (!hasAdultPrice && hasChildPrice)) {
    return next(new AppError("Both adultPrice and childPrice must be provided together.", 400));
  }

  if ((hasAdultData && !hasChildData) || (!hasAdultData && hasChildData)) {
    return next(new AppError("Both adultData and childData must be provided together.", 400));
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
    galleryImages,
    galleryVideos,
    availableDays,
    sessions: selectedSessions,
    adultPrice,
    childPrice,
    isPickupRequired,
    isDropOffRequired,
    addOn,
    adultData,
    childData,
    limit,
    stopSales,
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
    addOn, // Use "addon" instead of "addOn"
    adultData, // New field for detailed adult pricing
    childData, // New field for detailed child pricing
    limit,
    stopSales,
  } = req.body.formData;

  // Validate required fields
  const requiredFields = [
    { name: "category", value: category },
    { name: "coverImage", value: coverImage },
    { name: "title", value: title },
    { name: "description", value: description },
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

  // Ensure only one type of pricing data is provided
  const hasAdultPrice = adultPrice !== undefined && adultPrice !== null && adultPrice !== "";
  const hasChildPrice = childPrice !== undefined && childPrice !== null && childPrice !== "";
  const hasAdultData =
    adultData && adultData.some((row) => Number(row.pax) > 0 || Number(row.price) > 0);
  const hasChildData =
    childData && childData.some((row) => Number(row.pax) > 0 || Number(row.price) > 0);

  if ((hasAdultPrice || hasChildPrice) && (hasAdultData || hasChildData)) {
    return next(
      new AppError("Provide either single price fields or detailed pricing data, not both.", 400),
    );
  }

  if ((hasAdultPrice && !hasChildPrice) || (!hasAdultPrice && hasChildPrice)) {
    return next(new AppError("Both adultPrice and childPrice must be provided together.", 400));
  }

  if ((hasAdultData && !hasChildData) || (!hasAdultData && hasChildData)) {
    return next(new AppError("Both adultData and childData must be provided together.", 400));
  }

  // Prepare the update data, conditionally including pricing data
  const updateData = {
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
    sessions: selectedSessions,
    isPickupRequired,
    isDropOffRequired,
    addOn, // Changed to match the request
    limit,
    stopSales,
    ...(hasAdultData && { adultData }),
    ...(hasChildData && { childData }),
    ...(hasAdultPrice && { adultPrice }),
    ...(hasChildPrice && { childPrice }),
  };

  // Handle the case where the user switches from one type of pricing data to the other
  if (hasAdultData || hasChildData) {
    // If detailed pricing data is provided, remove the single price fields
    updateData.$unset = { adultPrice: "", childPrice: "" };
  } else if (hasAdultPrice || hasChildPrice) {
    // If single price fields are provided, remove the detailed pricing data
    updateData.$unset = { adultData: "", childData: "" };
  }

  // Update the plan
  const updatedPlan = await Plan.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

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
  // const userId = req?.user ? req?.user?.id : null; // Get the user ID if available
  const userId = req.query.user != "undefined" ? req.query.user : null;

  const plan = await Plan.findOne({ _id: id, isActive: true });

  if (!plan) {
    return next(new AppError("No plan found with that ID", 404));
  }

  let canWriteReview = false; // Default to false
  let cartId = false;
  let favId = false;

  if (userId) {
    // Check if the user has a booked ticket for the plan with a future date
    const ticket = await Ticket.findOne({
      user: userId,
      plan: id,
      status: "Booked",
      date: { $lt: Date.now() },
    });

    const cart = await Cart.findOne({ tour: plan._id, user: userId });

    const fav = await Favourite.findOne({ tour: plan._id, user: userId });
    if (cart) cartId = cart._id;
    if (fav) favId = fav._id;

    if (ticket) {
      canWriteReview = true; // Set to true if such a ticket is found
    }
  }

  res.status(200).json({
    status: "success",
    data: {
      plan,
      canWriteReview,
      fav: favId,
      cart: cartId,
    },
  });
});

// Get plans by category ID
exports.getPlanByCategory = catchAsync(async (req, res, next) => {
  console.log(req.params);
  const userId = req.query.user != "undefined" ? req.query.user : null;
  console.log(req.query.user);
  console.log(userId);
  const { categoryId } = req.params;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  console.log("today ***8 **** ");
  console.log(today);
  // Retrieve active plans and category
  const plansQuery = Plan.find({
    category: categoryId,
    isActive: true,
    stopSales: { $nin: [today] },
  });
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
