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
const couriseModel = mongoose.Schema({
  coverImage: {
    type: String,
    // required: [true, "Provide a valid image"],
  },
  title: localizedString,
  description: localizedString,
});

const Courise = mongoose.model("Courise ", couriseModel);

module.exports = Courise;
