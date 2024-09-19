const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Please provide a userId."],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Please provide a courseid."],
    },
    tour: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: [true, "Please provide a courseid."],
    },
    adultCount: {
      type: Number,
      default: 0,
    },
    childCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

const Cart = mongoose.model("Cart", cartSchema);

module.exports = Cart;
