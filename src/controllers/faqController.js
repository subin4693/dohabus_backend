const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const FAQ = require("../models/faqModel");

// Create a new FAQ
exports.createFAQ = catchAsync(async (req, res, next) => {
    console.log("1")
    const { question, answer } = req.body;
    console.log(question, answer);

    // Check if all fields, including localized strings, are provided
    if (!question?.en || !question?.ar || !answer?.en || !answer?.ar) {
        return next(
            new AppError("All fields, including localized strings, are required to create a FAQ", 400)
        );
    }
    console.log("2")


    // Create a new FAQ document
    const newFAQ = await FAQ.create({
        question,
        answer,
    });
    console.log("3")

    // Send a response back to the client
    res.status(201).json({
        status: "success",
        data: {
            faq: newFAQ,
        },
    });
});

// Get all FAQs
exports.getFAQs = catchAsync(async (req, res, next) => {
    const faqs = await FAQ.find(); // Fetch all FAQs

    res.status(200).json({
        status: "success",
        data: {
            faqs,
        },
    });
});

// Get a specific FAQ by ID
exports.getFAQById = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const faq = await FAQ.findById(id);
    if (!faq) {
        return next(new AppError("No FAQ found with that ID", 404));
    }

    res.status(200).json({
        status: "success",
        data: {
            faq,
        },
    });
});

// Delete an FAQ
exports.deleteFAQ = catchAsync(async (req, res, next) => {
    const { id } = req.params; // Extract the ID from the request parameters

    const deletedFAQ = await FAQ.findByIdAndDelete(id); // Delete the FAQ by ID

    if (!deletedFAQ) {
        return next(new AppError("No FAQ found with that ID", 404));
    }

    res.status(200).json({
        status: "success",
        message: "FAQ deleted successfully",
        data: null,
    });
});

// Edit an FAQ
exports.editFAQ = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const updateFields = req.body;

    // Check if all required fields are present
    if (
        updateFields.question &&
        (!updateFields.question.en || !updateFields.question.ar) ||
        updateFields.answer &&
        (!updateFields.answer.en || !updateFields.answer.ar)
    ) {
        return next(new AppError("All fields, including localized strings, are required to update a FAQ", 400));
    }

    const faq = await FAQ.findByIdAndUpdate(id, updateFields, {
        new: true,
        runValidators: true,
    });

    if (!faq) {
        return next(new AppError("FAQ not found", 404));
    }

    res.status(200).json({
        status: "success",
        data: {
            faq,
        },
    });
});

// Switch FAQ active status (if you want to implement this functionality)
exports.switchFAQStatus = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const faq = await FAQ.findById(id);
    if (!faq) {
        return next(new AppError("FAQ not found", 404));
    }

    // Here, you could implement any logic for toggling active status
    // For example, you might want to add an `isActive` field to the schema

    res.status(200).json({
        message: "FAQ status updated successfully",
        data: faq,
    });
});
