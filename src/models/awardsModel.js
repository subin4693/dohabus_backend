const mongoose = require("mongoose");

const awardModel = new mongoose.Schema({
    image: {
        type: String,
        required: [true, "Please provide a valid image"],
    },
});

module.exports = new mongoose.model("Award", awardModel);

// {
// 	"image":"image string"
// }
