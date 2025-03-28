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
    minPerson,
    pricingLimits,
  } = req.body;

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

  if (pricingLimits && pricingLimits.length > 0) {
    for (const limit of pricingLimits) {
      const { startDate, endDate, adultPrice, childPrice, adultData, childData } = limit;

      // Check for required fields `startDate` and `endDate`
      if (!startDate || !endDate) {
        return next(
          new AppError("Both startDate and endDate must be provided in pricingLimits.", 400),
        );
      }

      // Flags to check if pricing data exists
      const hasAdultPrice = adultPrice !== undefined && adultPrice !== null && adultPrice !== "";
      const hasChildPrice = childPrice !== undefined && childPrice !== null && childPrice !== "";
      const hasAdultData =
        adultData && adultData.some((row) => Number(row.pax) > 0 || Number(row.price) > 0);
      const hasChildData =
        childData && childData.some((row) => Number(row.pax) > 0 || Number(row.price) > 0);

      // Ensure at least one adult and one child price type exists
      if (!(hasAdultPrice || hasAdultData)) {
        return next(
          new AppError(
            `For pricing limit between ${startDate} and ${endDate}, provide either adultPrice or adultData.`,
            400,
          ),
        );
      }
      if (!(hasChildPrice || hasChildData)) {
        return next(
          new AppError(
            `For pricing limit between ${startDate} and ${endDate}, provide either childPrice or childData.`,
            400,
          ),
        );
      }

      // Ensure only one type of adult and one type of child pricing is provided
      if ((hasAdultPrice && hasAdultData) || (hasChildPrice && hasChildData)) {
        return next(
          new AppError(
            `For pricing limit between ${startDate} and ${endDate}, provide either price fields (adultPrice/childPrice) or detailed pricing data (adultData/childData), not both.`,
            400,
          ),
        );
      }
    }
  }

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
    defaultAdultPrice: hasAdultPrice ? adultPrice : null,
    defaultChildPrice: hasChildPrice ? childPrice : null,
    isPickupRequired,
    isDropOffRequired,
    addOn,
    defaultAdultData: hasAdultData ? adultData : null,
    defaultChildData: hasChildData ? childData : null,
    limit,
    stopSales,
    minPerson,
    pricingLimits:pricingLimits,
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
    adultData,
    childData,
    limit,
    stopSales,
    minPerson,
    pricingLimits,
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
  if (pricingLimits && pricingLimits.length > 0) {
    for (const limit of pricingLimits) {
      const { startDate, endDate, adultPrice, childPrice, adultData, childData } = limit;

      // Check for required fields `startDate` and `endDate`
      if (!startDate || !endDate) {
        return next(
          new AppError("Both startDate and endDate must be provided in pricingLimits.", 400),
        );
      }

      // Flags to check if pricing data exists
      const hasAdultPrice = adultPrice !== undefined && adultPrice !== null && adultPrice !== "";
      const hasChildPrice = childPrice !== undefined && childPrice !== null && childPrice !== "";
      const hasAdultData =
        adultData && adultData.some((row) => Number(row.pax) > 0 || Number(row.price) > 0);
      const hasChildData =
        childData && childData.some((row) => Number(row.pax) > 0 || Number(row.price) > 0);

      // Ensure at least one adult and one child price type exists
      if (!(hasAdultPrice || hasAdultData)) {
        return next(
          new AppError(
            `For pricing limit between ${startDate} and ${endDate}, provide either adultPrice or adultData.`,
            400,
          ),
        );
      }
      if (!(hasChildPrice || hasChildData)) {
        return next(
          new AppError(
            `For pricing limit between ${startDate} and ${endDate}, provide either childPrice or childData.`,
            400,
          ),
        );
      }

      // Ensure only one type of adult and one type of child pricing is provided
      if ((hasAdultPrice && hasAdultData) || (hasChildPrice && hasChildData)) {
        return next(
          new AppError(
            `For pricing limit between ${startDate} and ${endDate}, provide either price fields (adultPrice/childPrice) or detailed pricing data (adultData/childData), not both.`,
            400,
          ),
        );
      }
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
    addOn,
    limit,
    stopSales,
    minPerson,
    pricingLimits,
    defaultAdultData: hasAdultData ? adultData : null,
    defaultChildData: hasChildData ? childData : null,
    defaultAdultPrice: hasAdultPrice ? adultPrice : null,
    defaultChildPrice: hasChildPrice ? childPrice : null,
  };

  // Handle the case where the user switches from one type of pricing data to the other
  // if (hasAdultData || hasChildData) {
  //   // If detailed pricing data is provided, remove the single price fields
  //   updateData.$unset = { adultPrice: "", childPrice: "" };
  // } else if (hasAdultPrice || hasChildPrice) {
  //   // If single price fields are provided, remove the detailed pricing data
  //   updateData.$unset = { adultData: "", childData: "" };
  // }

  // Update the plan

  console.log("** for fianl test print ****************************************");
  console.log(updateData);
  
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

  const email = req.query.user != "undefined" ? req.query.email : null;
  const userId = req.query.user != "undefined" ? req.query.user : null;
  console.log("Plan id");
  console.log(id);
  const plan = await Plan.findOne({ _id: id, isActive: true }).exec();

  if (!plan) {
    return next(new AppError("No plan found with that ID", 404));
  }

  let canWriteReview = false; // Default to false
  let cartId = false;
  let favId = false;

  if (email) {
    // Check if the user has a booked ticket for the plan with a future date
    const ticket = await Ticket.findOne({
      email: email,
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
  const userId = req.query.user != "undefined" ? req.query.user : null;

  const { categoryId } = req.params;

 

  // Retrieve active plans and category
  const plansQuery = Plan.find({
    category: categoryId,
    isActive: true,
    
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

    favid = favMap.get(planIdStr);

    return {
      ...plan._doc,
      isInCart: cartMap.has(planIdStr),
      isInFavorites: favMap.has(planIdStr),
      cartId: cartMap.get(planIdStr) || null,
      favId: favMap.get(planIdStr) || null,
    };
  });

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
