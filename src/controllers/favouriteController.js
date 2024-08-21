const Favourite = require("../models/favouritesModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

exports.createFavourite = catchAsync(async (req, res, next) => {
    const user = req.user;
    const { category, tour } = req.body;

    console.log(user.id, category, tour);

    const existingFavourite = await Favourite.findOne({ user: user.id, category, tour });
    console.log(existingFavourite);

    if (existingFavourite) {
        return next(new AppError("This item is already in your favourites.", 400));
    }

    const newFavourite = await Favourite.create({ user: user.id, category, tour });

    res.status(201).json({
        status: "success",
        data: {
            favourite: newFavourite
        }
    });
});





exports.getAllFavourites = catchAsync(async (req, res, next) => {
    const favourites = await Favourite.find().populate("user category tour");

    res.status(200).json({
        status: "success",
        results: favourites.length,
        data: {
            favourites
        }
    });
});

exports.getFavouriteById = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const favourite = await Favourite.findById(id).populate("user category tour");

    if (!favourite) {
        return next(new AppError("No favourite found with that ID", 404));
    }

    res.status(200).json({
        status: "success",
        data: {
            favourite
        }
    });
});

exports.deleteFavourite = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const favourite = await Favourite.findByIdAndDelete(id);

    if (!favourite) {
        return next(new AppError("No favourite found with that ID", 404));
    }

    res.status(204).json({
        status: "success",
        data: null
    });
});

