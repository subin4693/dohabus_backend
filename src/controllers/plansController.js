const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const Plan = require ('../models/planModel')

exports.createNewPlans = catchAsync(async (req, res, next) => {
    const {
        category, coverImage, title, description, hopOn, hopOff, places, timings,
         includes, importantInformations, notes, gallerys, price} = req.body;
         
         if(!category || !coverImage || !title || !description || !hopOn || !hopOff || 
            !places || !timings || !includes || !importantInformations || !notes || !gallerys || !price){
                const error = new AppError("All fields are required to create a category", 400);
                return next(error);
            }
            const newPlan = await Plan.create({
                category,
                coverImage,
                title,
                description,
                hopOn,
                hopOff,
                places,
                timings,
                includes,
                importantInformations,
                notes,
                gallerys,
                price
            });
            res.status(201).json({
                status:"success",
                data:{
                    plan:newPlan
                }
            })
});
exports.getAllPlans = catchAsync(async (req, res, next) => {
    const plans = await Plan.find()
    console.log("plan get all",plans);

    res.status(200).json({
     status :"success",
     results:this.getAllPlans.length,
     data:{
        plans
     }
    })
});
exports.deletePlan = catchAsync(async (req, res, next) => {
   const {id}=req.params

   const plan = await Plan.findByIdAndDelete(id)

   if(!plan){
    return next(new AppError("No plan found with that ID", 404));
   }
   res.status(200).json({
    status:"success",
    message: "plan deleted successfully",
    data:null
   })

});
exports.editPlan = catchAsync(async (req, res, next) => {
    const {id}=req.params
    const {
        category, coverImage, title, description, hopOn, hopOff, places, timings,
         includes, importantInformations, notes, gallerys, price} = req.body;

         if(!category || !coverImage || !title || !description || !hopOn || !hopOff || 
            !places || !timings || !includes || !importantInformations || !notes || !gallerys || !price){
                const error = new AppError("All fields are required to create a category", 400);
                return next(error);
            }

            const updatedPlan= await Plan.findByIdAndUpdate(
                id,
            {category, coverImage, title, description, hopOn, hopOff, places, timings,
                includes, importantInformations, notes, gallerys, price},
            {new:true, runValidators: true})

            if (!updatedPlan) {
                return next(new AppError("No plan found with that ID", 404));
            }

            res.status(200).json({
                status:"success",
                data:{
                    plan:updatedPlan
                }
            })

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
