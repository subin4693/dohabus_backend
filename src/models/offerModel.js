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
  },
  { timestamps: true },
);

const Offer = mongoose.model("Offer", offerModel);

module.exports = Offer;
