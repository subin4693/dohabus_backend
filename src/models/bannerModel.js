const mongoose = require("mongoose");

const bannerModel = new mongoose.Schema({
  image: {
    type: String,
    required: [true, "Please provide a valid image"],
  },
  // url: {
  //   type: String,
  //   required: [true, "Please provide a valid link"],
  // },
});

module.exports = new mongoose.model("Banner", bannerModel);

// {
// 	"image":"image url",
// 	"url":"url link"
// }
