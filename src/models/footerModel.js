const mongoose = require("mongoose");

const footerModel = new mongoose.Schema({
  image: {
    type: String,
    required: [true, "Please provide a valid image"],
  },
});

module.exports = new mongoose.model("Footer", footerModel);

// {
// 	"image":"image string"
// }
