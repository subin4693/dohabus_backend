const mongoose = require("mongoose");

// Define a schema for localized strings
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

// Define the transportation schema
const transportationModel = new mongoose.Schema(
  {
    coverImage: {
      type: String,
      required: [true, "Please provide a cover image for the tour transportation"],
    },
    title: localizedString, // Title with localization
    places: [localizedString], // Places array with localization
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// Create the model from the schema
const Transportation = mongoose.model("Transportation", transportationModel);

module.exports = Transportation;
