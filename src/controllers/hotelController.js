const Hotel = require("../models/hotelModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

exports.createHotel = catchAsync(async (req, res, next) => {
    const { image, name, description } = req.body;
    console.log(image, name, description)
    const newHotel = await Hotel.create({ image, name, description });

    res.status(201).json({
        status: "success",
        data: {
            hotel: newHotel
        }
    });
});

exports.getAllHotels = catchAsync(async (req, res, next) => {
    const hotels = await Hotel.find();

    res.status(200).json({
        status: "success",
        data: {
            hotels
        }
    });
});

exports.getHotelById = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const hotel = await Hotel.findById(id);

    if (!hotel) {
        return next(new AppError("No hotel found with that ID", 404));
    }

    res.status(200).json({
        status: "success",
        data: {
            hotel
        }
    });
});

exports.updateHotel = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { image, name, description } = req.body;

    const updatedHotel = await Hotel.findByIdAndUpdate(
        id,
        { image, name, description },
        { new: true, runValidators: true }
    );

    if (!updatedHotel) {
        return next(new AppError("No hotel found with that ID", 404));
    }

    res.status(200).json({
        status: "success",
        data: {
            hotel: updatedHotel
        }
    });
});

exports.deleteHotel = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const hotel = await Hotel.findByIdAndDelete(id);

    if (!hotel) {
        return next(new AppError("No hotel found with that ID", 404));
    }

    res.status(204).json({
        status: "success",
        data: null
    });
});
