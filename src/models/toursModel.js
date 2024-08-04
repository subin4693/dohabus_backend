const mongoose = require("mongoose");

const tourModel = new mongoose.Schema({
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
const Tour = new mongoose.model("Tour", tourModel);

module.exports = Tour;
