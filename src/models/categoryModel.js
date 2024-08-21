const mongoose = require("mongoose");
//sea tours,city tours...
const categorysModel = new mongoose.Schema(
  {
    coverImage: {
      type: String,
      required: [true, "Please provide cover image for tour categorys"],
    },

    title: {
      type: String,
      trim: true,
      required: [true, "Please provide a valid title  for tour categorys"],
    },

    description: {
      type: String,
      required: [true, "Please provide a valid description   for tour categorys"],
      trim: true,
    },
  },
  { timestamps: true },
);

const Category = new mongoose.model("Category", categorysModel);

module.exports = Category;
