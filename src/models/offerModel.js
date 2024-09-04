const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    couponCode: {
      type: String,
      required: true,

      trim: true,
    },
    startingDate: {
      type: Date,
      required: true,
    },
    endingDate: {
      type: Date,
      required: true,
    },
    childDiscountType: {
      type: String,
      enum: ["percentage", "price"],
      required: true,
    },
    adultDiscountType: {
      type: String,
      enum: ["percentage", "price"],
      required: true,
    },
    childDiscountPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    adultDiscountPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["active", "canceled", "expired"],
      default: "active",
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "plan id is required"],
      ref: "Plan",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Offer", offerSchema);
