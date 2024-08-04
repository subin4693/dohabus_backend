const mongoose = require("mongoose");

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
  description: {
    type: String,
    required: [true, "Please provide a valid description   for tour"],
    trim: true,
  },
  hopOn: {
    type: String,
    required: [true, "Please provide a valid hop-on   for tour"],
    trim: true,
  },
  hopOff: {
    type: String,
    required: [true, "Please provide a valid hop-off   for tour"],
    trim: true,
  },
  places: [
    {
      type: String,
      required: [true, "Please provide a valid places  for tour"],
      trim: true,
    },
  ],
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
  importantInformations: [
    {
      type: String,
      required: [true, "Please provide a valid informations for tour"],
      trim: true,
    },
  ],
  notes: [
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
  price: {
    type: Number,
    required: [true, "Please provide a valid price for tour"],
  },
});
const Plan = new mongoose.model("Plan", plansModel);

module.exports = Plan;
