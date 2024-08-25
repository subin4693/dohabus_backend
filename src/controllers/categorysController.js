const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const category = require("../models/categoryModel")

exports.createCategory = catchAsync(async (req, res, next) => {
    console.log("API called successfully");

    const { coverImage, title, description } = req.body;

    if (!coverImage || !title || !description) {
        return next(new AppError("All fields are required to create a category", 400));
    }

    const newCategory = await category.create({
        coverImage,
        title,
        description
    });

    console.log(newCategory);

    res.status(201).json({
        status: "success",
        data: {
            category: newCategory
        }
    });
});


exports.getCategorys = catchAsync(async (req, res, next) => {
    const categories = await category.find()
    console.log("category", categories)

    res.status(200).json({
        status: "success",
        data: {
            categories
        }
    })
});
exports.deleteCategory = catchAsync(async (req, res, next) => {
    console.log("delete api called")
    const { id } = req.params
    console.log(id)
    const Category = await category.findByIdAndDelete(id)

    if (!Category) {
        const error = new AppError("No category found with that ID", 404);
        return next(error);
    }

    console.log("delition completed");
    res.status(200).json({
        status: "success",
        message: "Category deleted successfully",
        data: null,
    });
});

exports.editCategory = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { coverImage, title, description } = req.body;

    console.log("ID from params:", id);
    console.log("Request body:", { coverImage, title, description });

    if (!coverImage || !title || !description) {
        return next(new AppError("Cover image, title, and description are required to update a category", 400));
    }

    const updatedCategory = await category.findByIdAndUpdate(
        id,
        { coverImage, title, description },
        { new: true, runValidators: true }
    );

    console.log("Updated category data:", updatedCategory);

    if (!updatedCategory) {
        return next(new AppError("No category found with that ID", 404));
    }

    res.status(200).json({
        status: "success",
        data: {
            category: updatedCategory
        }
    });
});

