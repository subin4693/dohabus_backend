const Offer = require("../models/offerModel"); // Ensure the path is correct
const Plan = require("../models/planModel"); // Ensure the path is correct
const Ticket = require("../models/ticketModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.createOffer = catchAsync(async (req, res, next) => {
  const { plan, ...offerData } = req.body; // Extract plan array and the rest of the offer data

  if (!plan || plan.length === 0) {
    return next(new AppError("No plan provided", 400));
  }

  // Loop over each plan and create an offer for each plan
  const createdOffers = await Promise.all(
    plan.map(async (planId) => {
      const newOffer = await Offer.create({ ...offerData, plan: planId });
      return await newOffer.populate("plan"); // Populate the plan for each offer
    }),
  );

  res.status(201).json({
    status: "success",
    data: {
      offers: createdOffers, // Return all the created offers
    },
  });
});

exports.getOffer = catchAsync(async (req, res, next) => {
  const offers = await Offer.find().populate({
    path: "plan",
    select: "coverImage title adultPrice childPrice", // Select fields you want to include from Plan
  });

  res.status(200).json({
    status: "success",
    results: offers.length,
    data: {
      offers,
    },
  });
});

exports.switchOffer = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const offer = await Offer.findById(id);

  if (!offer) {
    return next(new AppError("No offer found with that ID", 404));
  }

  // Toggle the status
  offer.status = offer.status === "active" ? "canceled" : "active";

  const updatedOffer = await offer.save();
  const off = await updatedOffer.populate("plan");

  res.status(200).json({
    status: "success",
    data: {
      offer: off,
    },
  });
});

exports.deleteOffer = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const deletedOffer = await Offer.findByIdAndDelete(id);

  if (!deletedOffer) {
    return next(new AppError("No offer found with that ID", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

exports.checkOffer = catchAsync(async (req, res, next) => {
  try {
    const {
      couponCode,
      planId,
      email,
      childCount = 0,
      adultCount = 0,
      addons = [],
    } = req.body.requestData;

    console.log(addons);

    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        status: "fail",
        message: "Plan not found",
      });
    }

    const { childPrice, adultPrice, adultData, childData, addOn } = plan;

    const coupon = await Offer.findOne({
      couponCode: couponCode,
      plan: planId, // Check if planId is in the plan array
      status: "active",
    });

    const { limit } = coupon;

    const userTicketCount = await Ticket.countDocuments({
      plan: planId,
      offer: coupon._id,
      email,
    });
    if (userTicketCount >= limit && limit != 0) {
      return next(new AppError(`Coupon code can only be used ${limit} time(s) per user`, 400));
    }

    if (!coupon) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid or expired coupon code",
      });
    }
    const now = new Date();
    if (now < coupon.startingDate || now > coupon.endingDate) {
      return res.status(400).json({
        status: "fail",
        message: "Coupon code is not valid at this time",
      });
    }
    let addOnTotalPrice = 0;
    let totalAdultPrice = 0,
      totalChildPrice = 0;

    if (adultPrice || childPrice) {
      totalAdultPrice = adultPrice * adultCount || 0;
      totalChildPrice = childPrice * childCount || 0;
    } else {
      // Case 2: Calculate based on adultData and childData if prices are not present

      // Adult Data Calculation
      if (adultData && adultCount > 0) {
        const sortedAdultData = adultData.sort((a, b) => a.pax - b.pax); // Sort by pax ascending

        const minAdultPax = sortedAdultData[0]?.pax; // Get the minimum pax from sortedAdultData

        if (adultCount < minAdultPax) {
          return res.status(400).json({
            message: `The minimum adult count should be ${minAdultPax}. You have selected ${adultCount}.`,
          });
        }
        const selectedAdultData = sortedAdultData.filter((adult) => adult.pax <= adultCount).pop(); // Get the closest pax <= adultCount

        totalAdultPrice = selectedAdultData ? selectedAdultData.price * adultCount : 0; // Use the selected price and multiply by the count
      }

      // Child Data Calculation
      if (childData && childCount > 0) {
        const sortedChildData = childData.sort((a, b) => a.pax - b.pax); // Sort by pax ascending

        const minChildPax = sortedChildData[0]?.pax; // Get the minimum pax from sortedChildData

        // Check if childQuantity is greater than or equal to the minimum pax
        if (childCount < minChildPax) {
          return res.status(400).json({
            message: `The minimum child count should be ${minChildPax}. You have selected ${childCount}.`,
          });
        }
        const selectedChildData = sortedChildData.filter((child) => child.pax <= childCount).pop(); // Get the closest pax <= childCount

        totalChildPrice = selectedChildData ? selectedChildData.price * childCount : 0; // Use the selected price and multiply by the count
      }
    }

    // totalAdultPrice = adultPrice * adultCount;
    // totalChildPrice = childPrice * childCount;

    let adultDiscountAmount = 0;

    if (adultCount > 0 && coupon.adultDiscountType === "percentage") {
      adultDiscountAmount = (totalAdultPrice * coupon.adultDiscountPrice) / 100;
      console.log(totalAdultPrice);
      console.log(coupon);
      console.log(adultDiscountAmount);
      // adultDiscountAmount = (totalAdultPrice * coupon.adultDiscountPrice) / 100;
    } else if (adultCount > 0 && coupon.adultDiscountType === "price") {
      adultDiscountAmount = coupon.adultDiscountPrice;
    }

    let childDiscountAmount = 0;
    if (childCount > 0 && coupon.childDiscountType === "percentage") {
      childDiscountAmount = (totalChildPrice * coupon.childDiscountPrice) / 100;

      // childDiscountAmount = (totalChildPrice * coupon.childDiscountPrice) / 100;
    } else if (childCount > 0 && coupon.childDiscountType === "price") {
      childDiscountAmount = coupon.childDiscountPrice;
    }

    if (addons?.length > 0) {
      // Loop through add-on IDs and find matches in data.addOn
      addons.forEach((addOnId) => {
        const [addId, count] = addOnId.split(":");
        const matchingAddOn = addOn?.find((addOn) => addOn._id == addId);
        if (matchingAddOn) {
          const addOnCount = parseInt(count, 10) || 1;
          // Add the price of the matched add-on
          addOnTotalPrice += matchingAddOn.price * addOnCount;
        }
        console.log(addOnTotalPrice);
      });

      // Multiply the add-on total by the adultCount and childCount
      //addOnTotalPrice = addOnTotalPrice * (adultCount + childCount);
    }

    const totalDiscountAmount = adultDiscountAmount + childDiscountAmount;
    const totalPrice = totalAdultPrice + totalChildPrice;
    const discountedPrice = totalPrice - totalDiscountAmount;

    res.status(200).json({
      status: "success",
      data: {
        discountedPrice: Math.max(0, discountedPrice + addOnTotalPrice), // Ensure price is not negative
        originalPrice: totalPrice + addOnTotalPrice,
        totalDiscountAmount,
        adultDiscountAmount,
        childDiscountAmount,
      },
    });
  } catch (error) {
    next(error);
  }
});
