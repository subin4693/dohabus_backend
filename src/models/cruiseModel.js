const mongoose = require("mongoose");
const localizedString = {
	en: {
		type: String,
		required: [true, "English translation is required"],
		trim: true,
	},
	ar: {
		type: String,
		required: [true, "Arabic translation is required"],
		trim: true,
	},
};

const cruiseSchema = new mongoose.Schema({
	coverImage: {
		type: String,
		required: [true, "Provide a valid image"],
	},
	logo: {
		type: String,
		required: [true, "Provide a valid logo"],
	},
	title: localizedString,
	operatorName: {
		type: String,
		required: [true, "Please provide the operator name"],
		trim: true,
	},
	cruiseName: {
		type: String,
		required: [true, "Please provide the cruise name"],
		trim: true,
	},
	location: {
		type: localizedString, // Assuming the location might need to be localized as well
		required: [true, "Please provide the location"],
	},
	numberOfNights: {
		type: Number,
		required: [true, "Please provide the number of nights"],
	},
	stops: [
		{
			type: localizedString, // Assuming each stop might need a localized name
			required: [true, "Please provide stop information"],
		},
	],
});

module.exports = mongoose.model("Cruise", cruiseSchema);
