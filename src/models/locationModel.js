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

const locationModel = new mongoose.Schema(
  {
    title: localizedString,
    url: {
      type: String,
      trim: true,
      required: [true, "Please provide the URL"],
    },
    dates: [
      {
        day: localizedString,
        time: { type: String, required: [true, "Please provide the time "], trim: true },
      },
    ],
  },
  { timestamps: true },
);

const Location = mongoose.model("Location", locationModel);

module.exports = Location;

// Define localized string schema
// const localizedStringSchema = {
//   en: {
//     type: String,
//     required: [true, "Please provide the English translation"],
//     trim: true,
//   },
//   ar: {
//     type: String,
//     required: [true, "Please provide the Arabic translation"],
//     trim: true,
//   },
// };

// // Define the date schema
// const dateSchema = new mongoose.Schema({
//   day: localizedStringSchema,
//   time: {
//     type: String,
//     required: [true, "Please provide the time period"],
//     trim: true,
//   },
// });

// // Define the main schema
// const locationSchema = new mongoose.Schema(
//   {
//     title: localizedStringSchema,
//     dates: [dateSchema],
//   },
//   { timestamps: true }
// );
