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
	coverImage: {
		type: String,
		required: [true, "Provide a valid image"],
	},
	title: localizedString,
	description: localizedString,
});

const Hotel = mongoose.model("Hotel", hotelModel);

module.exports = Hotel;
