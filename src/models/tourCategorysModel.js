const mongoose = require("mongoose");
//sea tours,city tours...
const tourCategorysModel = new mongoose.Schema(
  {
    coverImage: {
      type: String,
      required: [true, "Please provide cover image for tour categorys"],
    },
    secondaryImage: {
      type: String,
      required: [true, "Please provide secondary image for tour categorys"],
    },
    titleOne: {
      type: String,
      trim: true,
      required: [true, "Please provide a valid title  for tour categorys"],
    },
    titleTwo: {
      type: String,
      required: [true, "Please provide a valid title 2  for tour categorys"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Please provide a valid description   for tour categorys"],
      trim: true,
    },
    popularLocations: {
      type: String,
      required: [true, "Please provide popular locations for tour categorys"],
      trim: true,
    },
  },
  { timestamps: true },
);

const Category = new mongoose.model("Category", tourCategorysModel);

module.exports = Category;
