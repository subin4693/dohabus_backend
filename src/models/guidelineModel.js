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
    text: localizedString,
  },
  { timestamps: true },
);

const GuideLine = mongoose.model("GuideLine", guidelineSchema);

module.exports = GuideLine;

// {
//   "image":"imageurl",
//   "text":{
//     "en":"english text",
//     "ar":"arabic text"
//   },
// "mission":{
//     "en":"english text",
//     "ar":"arabic text"
//   },
//   "vision":{
//     "en":"english text",
//     "ar":"arabic text"
//   },
// }
