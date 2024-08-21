const mongoose = require("mongoose");

const priceModel = new mongoose.Schema({
  type: {
    type: String,
    required: [true, "Please provide a valid type"],
  },
  detail: [
    {
      type: String,
      required: [true, "Please enter valid detail"],
    },
  ],
});

const plansModel = new mongoose.Schema({
  category: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "Category is required"],
    ref: "Category",
  },
  coverImage: {
    type: String,
    required: [true, "Please provide cover image for tour"],
  },
  title: {
    type: String,
    required: [true, "Please provide title for tour"],
    trim: true,
  },
  itinerary: {
    type: String,
    required: [true, "Please provide a valid description   for tour"],
    trim: true,
  },

  highlights: {
    type: String,
    required: [true, "Please provide a valid description   for tour"],
    trim: true,
  },
  timings: [
    {
      type: String,
      required: [true, "Please provide a valid dates for tour"],
      trim: true,
    },
  ],
  includes: [
    {
      type: String,
      required: [true, "Please provide a valid datas for tour"],
      trim: true,
    },
  ],

  excludes: [
    {
      type: String,
      required: [true, "Please provide a valid datas for tour"],
      trim: true,
    },
  ],
  importantInformations: [
    {
      type: String,
      required: [true, "Please provide a valid informations for tour"],
      trim: true,
    },
  ],

  cancellationpolicy: [
    {
      type: String,
      required: [true, "Please provide a valid notes for tour"],
      trim: true,
    },
  ],

  gallerys: [
    {
      type: String,
      required: [true, "Please provide a valid Gallery images for tour"],
    },
  ],
  price: [priceModel],
});
const Plan = new mongoose.model("Plan", plansModel);

module.exports = Plan;
