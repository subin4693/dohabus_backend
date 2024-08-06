const Cart = require("../models/cartModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.addToCart = catchAsync(async (req, res, next) => {
  const { user, category, tour } = req.body;
  console.log(user, category, tour);
  const existingCartItem = await Cart.findOne({ user, category, tour });

  if (existingCartItem) {
    return next(new AppError("This item is already in the cart.", 400));
  }

  const newCartItem = await Cart.create({ user, category, tour });

  res.status(201).json({
    status: "success",
    data: {
      cartItem: newCartItem
    }
  });
});

exports.getCart = catchAsync(async (req, res, next) => {
  const cartItems = await Cart.find({ user: req.user.id })
    .populate('category')
    .populate('tour');

  console.log(cartItems)

  res.status(200).json({
    status: "success",
    results: cartItems.length,
    data: {
      cartItems
    }
  });
});

exports.removeFromCart = catchAsync(async (req, res, next) => {
  const cartItem = await Cart.findByIdAndDelete(req.params.id);

  if (!cartItem) {
    return next(new AppError("No item found with that ID in the cart.", 404));
  }

  res.status(204).json({
    status: "success",
    data: null
  });
});
