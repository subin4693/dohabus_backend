const Cart = require("../models/cartModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.addToCart = catchAsync(async (req, res, next) => {
  const { category, tour, user, childCount, adultCount } = req.body;

  const existingCartItem = await Cart.findOne({ user: user._id, category, tour });

  if (existingCartItem) {
    return next(new AppError("This item is already in the cart.", 400));
  }

  const newCartItem = await Cart.create({ user: user._id, category, tour, childCount, adultCount });

  res.status(201).json({
    status: "success",
    data: {
      cartItem: newCartItem,
    },
  });
});

exports.getCart = catchAsync(async (req, res, next) => {
  const userId = req.query.user != "undefined" ? req.query.user : null;
  const cartItems = await Cart.find({ user: userId })
    .populate("category")
    .populate("tour");

  res.status(200).json({
    status: "success",
    results: cartItems.length,
    data: {
      cartItems,
    },
  });
});

exports.removeFromCart = catchAsync(async (req, res, next) => {
  const cartItem = await Cart.findByIdAndDelete(req.params.id);

  if (!cartItem) {
    return next(new AppError("No item found with that ID in the cart.", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});
