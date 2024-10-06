const mongoose = require("mongoose");

// Define a schema for localized strings for FAQ
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

// Create a schema for the FAQ
const faqModel = new mongoose.Schema(
    {
        question: localizedString,
        answer: localizedString,
    },
    { timestamps: true }
);


const FAQ = mongoose.model("FAQ", faqModel);

module.exports = FAQ;
