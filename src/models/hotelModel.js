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
const hotelModel = mongoose.Schema({
	image: {
		type: String,
		required: [true, "Provide a valid image"],
	},
	name: localizedString,
	description: localizedString,
});

const Hotel = mongoose.model("Hotel", hotelModel);

module.exports = Hotel;
