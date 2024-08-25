const mongoose = require("mongoose");
const localizedString = {
  en: {
    type: String,
    required: [true, "Please provide the English translation"],
    trim: true,
  },
  ar: {
    type: String,
    required: [true, "Please provide the Arabic translation"],
    trim: true,
  },
};
const categorysModel = new mongoose.Schema(
  {
    coverImage: {
      type: String,
      required: [true, "Please provide cover image for tour categorys"],
    },

    title: localizedString,

    description: localizedString,
  },
  { timestamps: true },
);

const Category = new mongoose.model("Category", categorysModel);

module.exports = Category;
