const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const category = require("../models/categoryModel")

exports.createCategory = catchAsync(async (req, res, next) => {
    console.log("api called succesfully")
    const { coverImage, secondaryImage, titleOne, titleTwo, description, popularLocations}= req.body
    if( !coverImage || !secondaryImage || !titleOne || !titleTwo || !description || !popularLocations){
        const error = new AppError("All fields are required to create a category", 400);
        return next(error);
      }
     
    const newCategory = await category.create({
        coverImage,
        secondaryImage,
        titleOne,
        titleTwo,
        description,
        popularLocations
    })
    console.log(newCategory)
     
    res.status(201).json({
       status:"success",
       data:{
        category:newCategory
       }
    })
});


exports.getCategorys = catchAsync(async (req, res, next) => {
    const categories = await category.find()
    console.log("category",categories)

    res.status(200).json({
        status:"success",
        data:{
            categories
        }
    })
});
exports.deleteCategory = catchAsync(async (req, res, next) => {
    console.log("delete api called")
   const {id}=req.params
   console.log(id)
   const Category = await category.findByIdAndDelete(id) 

   if(!Category){
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
    const {id}=req.params
    const { coverImage, secondaryImage, titleOne, titleTwo, description, popularLocations}=req.body
    console.log("id from params",id)
    console.log("body --", coverImage, secondaryImage, titleOne, titleTwo, description, popularLocations);
    if( !coverImage || !secondaryImage || !titleOne || !titleTwo || !description || !popularLocations){
        const error= new AppError("All fields are required to update a category", 400);
        return next(error)
    }

    const updatedCategory = await category.findByIdAndUpdate(
        id,
        {coverImage, secondaryImage, titleOne, titleTwo, description, popularLocations},
        {new:true,runValidators: true}
    )
    console.log("updated data",updatedCategory);
    if (!updatedCategory) {
        const error = new AppError("No category found with that ID", 404);
        return next(error);
    }
    res.status(200).json({
        status: "success",
        data: {
            category: updatedCategory
        }
    });

});
