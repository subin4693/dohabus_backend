const mongoose = require("mongoose");

const termsAndConditionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
    },
  },
  { timestamps: true },
);

const TermsAndConditions = mongoose.model("TermsAndConditions", termsAndConditionSchema); // Only define the model here.

module.exports = TermsAndConditions;
