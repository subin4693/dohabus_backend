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

const aboutUsSchema = new mongoose.Schema(
  {
    image: {
      type: String,
      required: [true, "Please provide the image URL"],
      trim: true,
    },
    text: localizedString,
    mission: localizedString,
    vision: localizedString,
  },
  { timestamps: true },
);

const Aboutus = mongoose.model("Aboutus", aboutUsSchema);

module.exports = Aboutus;

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
