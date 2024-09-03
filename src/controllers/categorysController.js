const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const Category = require("../models/categoryModel");
const Plan = require("../models/planModel");

exports.createCategory = catchAsync(async (req, res, next) => {
  console.log("API called successfully");

  const { coverImage, title, description } = req.body;

  if (!coverImage || !title?.en || !title?.ar || !description?.en || !description?.ar) {
    return next(
      new AppError(
        "All fields, including localized strings, are required to create a category",
        400,
      ),
    );
  }

  const newCategory = await Category.create({
    coverImage,
    title,
    description,
  });

  res.status(201).json({
    status: "success",
    data: {
      category: newCategory,
    },
  });
});

exports.getCategories = catchAsync(async (req, res, next) => {
  const categories = await Category.find();

  res.status(200).json({
    status: "success",
    data: {
      categories,
    },
  });
});

exports.deleteCategory = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const deletedCategory = await Category.findByIdAndDelete(id);

  if (!deletedCategory) {
    const error = new AppError("No category found with that ID", 404);
    return next(error);
  }

  res.status(200).json({
    status: "success",
    message: "Category deleted successfully",
    data: null,
  });
});

exports.editCategory = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { coverImage, title, description } = req.body;

  if (!req.body) {
    return next(
      new AppError(
        "Cover image, title (in both languages), and description (in both languages) are required to update a category",
        400,
      ),
    );
  }

  const updatedCategory = await Category.findByIdAndUpdate(
    id,
    { coverImage, title, description },
    { new: true, runValidators: true },
  );

  if (!updatedCategory) {
    return next(new AppError("No category found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      category: updatedCategory,
    },
  });
});

exports.getCategoriesWithTours = catchAsync(async (req, res, next) => {
  // Fetch all categories
  const categories = await Category.find()
    .lean() // Convert documents to plain JS objects
    .exec();

  // Fetch all tour plans and group by category ID
  const tours = await Plan.find({ isActive: true })
    .lean()
    .exec();

  // Map the categories to include the associated tours
  const result = categories.map((category) => {
    return {
      text: category.title, // Localized string handling can be applied here if needed
      _id: category._id,
      tours: tours
        .filter((tour) => tour.category.toString() === category._id.toString())
        .map((tour) => ({
          text: tour.title, // Localized string handling can be applied here if needed
          _id: tour._id,
        })),
    };
  });

  res.status(200).json({
    status: "success",
    data: {
      category: result,
    },
  });
});
