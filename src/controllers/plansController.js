const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const Plan = require('../models/planModel')

exports.createNewPlans = catchAsync(async (req, res, next) => {
    const {
        category, coverImage, title, itinerary, highlights, timings,
        includes, excludes, importantInformations, cancellationpolicy, gallerys, price
    } = req.body;

    if (!category || !coverImage || !title || !itinerary || !highlights || !timings ||
        !includes || !excludes || !importantInformations || !cancellationpolicy || !gallerys || !price) {
        const error = new AppError("All fields are required to create a plan", 400);
        return next(error);
    }

    const newPlan = await Plan.create({
        category,
        coverImage,
        title,
        itinerary,
        highlights,
        timings,
        includes,
        excludes,
        importantInformations,
        cancellationpolicy,
        gallerys,
        price
    });

    res.status(201).json({
        status: "success",
        data: {
            plan: newPlan
        }
    });
});
exports.getAllPlans = catchAsync(async (req, res, next) => {
    const plans = await Plan.find()
    console.log("plan get all", plans);

    res.status(200).json({
        status: "success",
        data: {
            plans
        }
    })
});
exports.deletePlan = catchAsync(async (req, res, next) => {
    const { id } = req.params

    const plan = await Plan.findByIdAndDelete(id)

    if (!plan) {
        return next(new AppError("No plan found with that ID", 404));
    }
    res.status(200).json({
        status: "success",
        message: "plan deleted successfully",
        data: null
    })

});
exports.editPlan = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const {
        category, coverImage, title, itinerary, highlights, timings,
        includes, excludes, importantInformations, cancellationpolicy, gallerys, price
    } = req.body;

    if (!category || !coverImage || !title || !itinerary || !highlights ||
        !timings || !includes || !excludes || !importantInformations ||
        !cancellationpolicy || !gallerys || !price) {
        return next(new AppError("All fields are required to update a plan", 400));
    }

    const updatedPlan = await Plan.findByIdAndUpdate(
        id,
        {
            category,
            coverImage,
            title,
            itinerary,
            highlights,
            timings,
            includes,
            excludes,
            importantInformations,
            cancellationpolicy,
            gallerys,
            price
        },
        {
            new: true,
            runValidators: true
        }
    );

    if (!updatedPlan) {
        return next(new AppError("No plan found with that ID", 404));
    }

    res.status(200).json({
        status: "success",
        data: {
            plan: updatedPlan
        }
    });
});

exports.getSinglePlan = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const plan = await Plan.findById(id);

    if (!plan) {
        return next(new AppError("No plan found with that ID", 404));
    }

    res.status(200).json({
        status: "success",
        data: {
            plan
        }
    });
});
exports.getPlanByCategory = catchAsync(async (req, res, next) => {
    const { categoryId } = req.params;

    const plans = await Plan.find({ category: categoryId });

    if (!plans || plans.length === 0) {
        return next(new AppError("No plans found for this category", 404));
    }

    res.status(200).json({
        status: "success",
        data: {
            plans
        }
    });
});

