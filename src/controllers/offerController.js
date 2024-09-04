const Offer = require("../models/offerModel"); // Ensure the path is correct
const Plan = require("../models/planModel"); // Ensure the path is correct
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.createOffer = catchAsync(async (req, res, next) => {
  const newOffer = await Offer.create(req.body);

  const data = await newOffer.populate("plan");
  console.log(data);
  res.status(201).json({
    status: "success",
    data: {
      offer: data,
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
    const { couponCode, planId, childCount, adultCount } = req.body;

    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        status: "fail",
        message: "Plan not found",
      });
    }

    const { childPrice, adultPrice } = plan;

    const coupon = await Offer.findOne({ couponCode: couponCode, plan: planId, status: "active" });

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

    const totalAdultPrice = adultPrice * adultCount;
    const totalChildPrice = childPrice * childCount;

    let adultDiscountAmount = 0;

    if (adultCount > 0 && coupon.adultDiscountType === "percentage") {
      adultDiscountAmount = (totalAdultPrice * (100 - coupon.adultDiscountPrice)) / 100;

      // adultDiscountAmount = (totalAdultPrice * coupon.adultDiscountPrice) / 100;
      console.log("working fine");
    } else if (adultCount > 0 && coupon.adultDiscountType === "price") {
      adultDiscountAmount = coupon.adultDiscountPrice;
    }

    let childDiscountAmount = 0;
    if (childCount > 0 && coupon.childDiscountType === "percentage") {
      childDiscountAmount = (totalChildPrice * (100 - coupon.childDiscountPrice)) / 100;
      console.log(childDiscountAmount);
      // childDiscountAmount = (totalChildPrice * coupon.childDiscountPrice) / 100;
    } else if (childCount > 0 && coupon.childDiscountType === "price") {
      childDiscountAmount = coupon.childDiscountPrice;
    }
    console.log(adultDiscountAmount);

    const totalDiscountAmount = adultDiscountAmount + childDiscountAmount;
    const totalPrice = totalAdultPrice + totalChildPrice;
    const discountedPrice = totalPrice - totalDiscountAmount;

    console.log({
      discountedPrice: Math.max(0, discountedPrice), // Ensure price is not negative
      originalPrice: totalPrice,
      totalDiscountAmount,
      adultDiscountAmount,
      childDiscountAmount,
    });
    res.status(200).json({
      status: "success",
      data: {
        discountedPrice: Math.max(0, discountedPrice), // Ensure price is not negative
        originalPrice: totalPrice,
        totalDiscountAmount,
        adultDiscountAmount,
        childDiscountAmount,
      },
    });
  } catch (error) {
    next(error);
  }
});
