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

const offerModel = new mongoose.Schema(
  {
    text: localizedString,
    link: {
      type: String,
      required: [true, "Please provide the English translation"],
      trim: true,
    },
    startingDate: {
      type: Date,
      required: [true, "Please provide the starting date"],
      trim: true,
    },
    endingDate: {
      type: Date,
      required: [true, "Please provide the ending date"],
      trim: true,
    },
  },
  { timestamps: true },
);

const Offer = mongoose.model("Offer", offerModel);

module.exports = Offer;
