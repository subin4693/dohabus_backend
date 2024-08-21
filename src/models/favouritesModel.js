const mongoose = require("mongoose");

const favouritesModel = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Please provide a userId."],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Please provide a courseid."],
    },
    tour: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: [true, "Please provide a courseid."],
    },
  },
  { timestamps: true },
);

const Favourite = mongoose.model("Favourite", favouritesModel);

module.exports = Favourite;
