const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "User ID is required"],
      ref: "User",
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Plan ID is required"],
      ref: "Plan",
    },
    reviewText: {
      type: String,
      required: [true, "Please provide a review text"],
      trim: true,
    },
    imageURL: {
      type: String,
      required: false, // Optional, as not every review may have an image
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  },
);

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
