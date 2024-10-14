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

const guidelineSchema = new mongoose.Schema(
  {
    heading: localizedString,
    points: [localizedString], // Array of localized strings for points
  },
  { timestamps: true },
);

const GuideLine = mongoose.model("GuideLine", guidelineSchema);

module.exports = GuideLine;

// Sample JSON structure
// {
//   "heading": {
//     "en": "English heading",
//     "ar": "Arabic heading"
//   },
//   "points": [
//     {
//       "en": "English point 1",
//       "ar": "Arabic point 1"
//     },
//     {
//       "en": "English point 2",
//       "ar": "Arabic point 2"
//     }
//   ]
// }
