const mongoose = require("mongoose");

const hotelModel = mongoose.Schema({
	image: {
		type: String,
		required: [true, "Provide a valid image"],
	},
	name: {
		type: String,
		required: [true, "Provide a valid name"],
	},
	description: {
		type: String,
		required: [true, "Provide a valid name"],
	},
});

const Hotel = mongoose.model("Hotel", hotelModel);

module.exports = Hotel;
