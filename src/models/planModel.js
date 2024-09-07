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
  duration: localizedString,
  typeOfTour: localizedString,
  addOn: [localizedString],
  transportation: localizedString,
  language: localizedString,
  description: localizedString,
  highlights: [localizedString],
  includes: [localizedString],
  itinerary: [localizedString],
  knowBeforeYouGo: [localizedString],
  faq: [
    {
      question: localizedString,
      answer: localizedString,
    },
  ],

  galleryimages: [
    {
      type: String,
    },
  ], //["image url1","imageurl2"]
  galleryvideos: [
    {
      type: String,
    },
  ],
  availableDays: [{ type: Number }], //[1,2,3,4]
  sessions: [
    {
      type: String,

      trim: true,
    },
  ], //[8:00Am, 12:00pm]

  adultPrice: {
    type: Number,
  }, //400
  childPrice: {
    type: Number,
  }, //2500
  isActive: {
    type: Boolean,
    default: true,
  },
  isPickupRequired: {
    type: Boolean,
    default: false,
  },
  isDropOffRequired: {
    type: Boolean,
    default: false,
  },
});
const Plan = new mongoose.model("Plan", plansModel);

module.exports = Plan;
