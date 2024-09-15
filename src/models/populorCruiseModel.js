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
const popularCouriseModel = mongoose.Schema({
	coverImage: {
		type: String,
		// required: [true, "Provide a valid image"],
	},
	title: localizedString,
	description: localizedString,
    duration: localizedString,
    price: Number,
});

const PopularCourise = mongoose.model("PopularCourise", popularCouriseModel);

module.exports = PopularCourise;
