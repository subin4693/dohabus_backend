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

  title: localizedString,
  itinerary: localizedString,
  highlights: [localizedString],
  timings: [localizedString],
  includes: [localizedString],
  excludes: [localizedString],
  importantInformations: [localizedString],
  cancellationpolicy: [localizedString],
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
