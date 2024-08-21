const User = require('../models/userModel');
const Ticket = require('../models/ticketModel');
const Plan = require('../models/planModel');
const AppError = require('../utils/appError');
const Cart = require('../models/cartModel');
const catchAsync = require('../utils/catchAsync');
const Favourite = require('../models/favouritesModel');

exports.getSummary = catchAsync(async (req, res, next) => {
    const usersCount = await User.countDocuments();

    const toursCount = await Plan.countDocuments();

    const totalBookings = await Ticket.countDocuments();

    const activeTickets = await Ticket.countDocuments({ status: 'Booked' });

    res.status(200).json({
        status: 'success',
        data: {
            users: usersCount,
            tours: toursCount,
            totalBookings: totalBookings,
            activeTickets: activeTickets,
        },
    });
});



exports.getMonthlySummary = catchAsync(async (req, res, next) => {

    const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];


    const currentYear = new Date().getFullYear();

    const monthlyData = months.map(month => ({
        name: month,
        ticketCount: 0,
        userCount: 0
    }));

    const tickets = await Ticket.aggregate([
        {
            $match: {
                dates: {
                    $gte: new Date(`${currentYear}-01-01`),
                    $lt: new Date(`${currentYear + 1}-01-01`)
                }
            }
        },
        {
            $project: {
                month: { $month: "$dates" }
            }
        },
        {
            $group: {
                _id: "$month",
                ticketCount: { $sum: 1 }
            }
        }
    ]);

    const users = await User.aggregate([
        {
            $project: {
                month: { $month: "$createdAt" }
            }
        },
        {
            $group: {
                _id: "$month",
                userCount: { $sum: 1 }
            }
        }
    ]);

    tickets.forEach(ticket => {
        const monthIndex = ticket._id - 1;
        if (monthlyData[monthIndex]) {
            monthlyData[monthIndex].ticketCount = ticket.ticketCount;
        }
    });

    users.forEach(user => {
        const monthIndex = user._id - 1;
        if (monthlyData[monthIndex]) {
            monthlyData[monthIndex].userCount = user.userCount;
        }
    });

    res.status(200).json({
        status: 'success',
        data: monthlyData
    });
});


exports.getPieChartData = catchAsync(async (req, res, next) => {
    const tickets = await Ticket.aggregate([
        {
            $group: {
                _id: "$plan",
                ticketCount: { $sum: 1 }
            }
        },
        {
            $lookup: {
                from: "plans",
                localField: "_id",
                foreignField: "_id",
                as: "planDetails"
            }
        },
        {
            $unwind: "$planDetails"
        },
        {
            $project: {
                _id: 0,
                name: "$planDetails.title",
                value: "$ticketCount"
            }
        }
    ]);

    res.status(200).json({
        status: 'success',
        data: tickets
    });
});


exports.getCarts = catchAsync(async (req, res, next) => {
    const carts = await Cart.aggregate([
        {
            $lookup: {
                from: 'users', 
                localField: 'user',
                foreignField: '_id',
                as: 'userDetails'
            }
        },
        {
            $unwind: {
                path: '$userDetails',
                preserveNullAndEmptyArrays: true 
            }
        },
        {
            $lookup: {
                from: 'categories', 
                localField: 'category',
                foreignField: '_id',
                as: 'categoryDetails'
            }
        },
        {
            $unwind: {
                path: '$categoryDetails',
                preserveNullAndEmptyArrays: true 
            }
        },
        {
            $lookup: {
                from: 'plans', 
                localField: 'tour',
                foreignField: '_id',
                as: 'planDetails'
            }
        },
        {
            $unwind: {
                path: '$planDetails',
                preserveNullAndEmptyArrays: true 
            }
        },
        {
            $project: {
                _id: 0,
                tourName: '$planDetails.title', 
                categoryName: '$categoryDetails.name', 
                username: '$userDetails.name', 
                userEmail: '$userDetails.email' 
            }
        }
    ]);

    res.status(200).json({
        status: 'success',
        results: carts.length,
        data: {
            carts
        }
    });
});

exports.getFavourites = catchAsync(async (req, res, next) => {
    const favourites = await Favourite.aggregate([
        {
            $lookup: {
                from: 'users', 
                localField: 'user',
                foreignField: '_id',
                as: 'userDetails'
            }
        },
        {
            $unwind: {
                path: '$userDetails',
                preserveNullAndEmptyArrays: true 
            }
        },
        {
            $lookup: {
                from: 'categories', 
                localField: 'category',
                foreignField: '_id',
                as: 'categoryDetails'
            }
        },
        {
            $unwind: {
                path: '$categoryDetails',
                preserveNullAndEmptyArrays: true 
            }
        },
        {
            $lookup: {
                from: 'plans', 
                localField: 'tour',
                foreignField: '_id',
                as: 'planDetails'
            }
        },
        {
            $unwind: {
                path: '$planDetails',
                preserveNullAndEmptyArrays: true 
            }
        },
        {
            $project: {
                _id: 0,
                tourName: '$planDetails.title', 
                favouritesName: '$categoryDetails.name', 
                username: '$userDetails.name',
                userEmail: '$userDetails.email' 
            }
        }
    ]);

    res.status(200).json({
        status: 'success',
        results: favourites.length,
        data: {
            favourites
        }
    });
});

