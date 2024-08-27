const mongoose = require("mongoose");

const videoModel = new mongoose.Schema({
  url: {
    type: String,
    required: [true, "Please provide a valid link"],
  },
});

module.exports = new mongoose.model("Video", videoModel);
