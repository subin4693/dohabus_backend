const User = require("../models/userModel");
const Ticket = require("../models/ticketModel");
const Plan = require("../models/planModel");
const AppError = require("../utils/appError");
const Cart = require("../models/cartModel");
const catchAsync = require("../utils/catchAsync");
const Favourite = require("../models/favouritesModel");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();
dotenv.config({ path: "dohabus_backend/.env" });
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});
const signature = `
    <div style="margin-left: 10px;">
        <p style="font-family: Arial, sans-serif; color: #333;"><b>Best regards,</b></p>
        <p style="font-family: Arial, sans-serif; color: #333;"><b>Doha Bus</b></p>
    </div>
    <div style="display: flex; justify-content: center; align-items: center; margin-top: 10px; padding: 10px;">
    <div style="display: flex; align-items: center; justify-content:center;">
       <div> <img src="https://eng.dohabus.com/English/images/LOGOFOOTER.png" alt="Signature Image" style="width: 100px; height: 100px; margin-right: 10px; object-fit: cover;"></div>
       <div> <h1 style="color: yellow; font-size: 2rem; margin: 0;">
       <b>Doha Bus</b>
   </h1></div>
    </div>
</div>
`;

exports.getSummary = catchAsync(async (req, res, next) => {
  const usersCount = await User.countDocuments();

  const toursCount = await Plan.countDocuments();

  const totalBookings = await Ticket.countDocuments();

  const activeTickets = await Ticket.countDocuments({
    status: "Booked",
    date: { $gte: new Date().setHours(0, 0, 0, 0) }, // Ensure the date is greater than or equal to today's date
  });

  res.status(200).json({
    status: "success",
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
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const currentYear = new Date().getFullYear();

  const monthlyData = months.map((month) => ({
    name: month,
    ticketCount: 0,
    userCount: 0,
  }));

  const tickets = await Ticket.aggregate([
    {
      $match: {
        dates: {
          $gte: new Date(`${currentYear}-01-01`),
          $lt: new Date(`${currentYear + 1}-01-01`),
        },
      },
    },
    {
      $project: {
        month: { $month: "$dates" },
      },
    },
    {
      $group: {
        _id: "$month",
        ticketCount: { $sum: 1 },
      },
    },
  ]);

  const users = await User.aggregate([
    {
      $project: {
        month: { $month: "$createdAt" },
      },
    },
    {
      $group: {
        _id: "$month",
        userCount: { $sum: 1 },
      },
    },
  ]);

  tickets.forEach((ticket) => {
    const monthIndex = ticket._id - 1;
    if (monthlyData[monthIndex]) {
      monthlyData[monthIndex].ticketCount = ticket.ticketCount;
    }
  });

  users.forEach((user) => {
    const monthIndex = user._id - 1;
    if (monthlyData[monthIndex]) {
      monthlyData[monthIndex].userCount = user.userCount;
    }
  });

  res.status(200).json({
    status: "success",
    data: monthlyData,
  });
});

exports.getPieChartData = catchAsync(async (req, res, next) => {
  const tickets = await Ticket.aggregate([
    {
      $group: {
        _id: "$plan",
        ticketCount: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: "plans",
        localField: "_id",
        foreignField: "_id",
        as: "planDetails",
      },
    },
    {
      $unwind: "$planDetails",
    },
    {
      $project: {
        _id: 0,
        name: "$planDetails.title",
        value: "$ticketCount",
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    data: tickets,
  });
});

exports.getCarts = catchAsync(async (req, res, next) => {
  const carts = await Cart.aggregate([
    // Join with users collection
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "userDetails",
      },
    },
    {
      $unwind: {
        path: "$userDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    // Join with categories collection
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "categoryDetails",
      },
    },
    {
      $unwind: {
        path: "$categoryDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    // Join with plans collection
    {
      $lookup: {
        from: "plans",
        localField: "tour",
        foreignField: "_id",
        as: "planDetails",
      },
    },
    {
      $unwind: {
        path: "$planDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    // Project required fields
    {
      $project: {
        _id: 0,
        tourName: "$planDetails.title",
        categoryName: "$categoryDetails.title",
        username: "$userDetails.name",
        userEmail: "$userDetails.email",
        quantity: "$quantity",
        dateAdded: "$dateAdded",
      },
    },
    // Debugging: Check intermediate results
    {
      $addFields: {
        debugCategory: "$categoryDetails",
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    results: carts.length,
    data: {
      carts,
    },
  });
});

exports.getFavourites = catchAsync(async (req, res, next) => {
  const favourites = await Favourite.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "userDetails",
      },
    },
    {
      $unwind: {
        path: "$userDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "categoryDetails",
      },
    },
    {
      $unwind: {
        path: "$categoryDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "plans",
        localField: "tour",
        foreignField: "_id",
        as: "planDetails",
      },
    },
    {
      $unwind: {
        path: "$planDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 0,
        tourName: "$planDetails.title",
        categoryName: "$categoryDetails.title",
        username: "$userDetails.name",
        userEmail: "$userDetails.email",
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    results: favourites.length,
    data: {
      favourites,
    },
  });
});

exports.getPlans = catchAsync(async (req, res, next) => {
  const plans = await Plan.aggregate([
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "categoryDetails",
      },
    },
    {
      $unwind: "$categoryDetails",
    },
    {
      $project: {
        _id: 1,
        coverImage: 1,
        title: 1,
        description: 1,
        isActive: 1, // Include the isActive field from the plans model
        "categoryDetails._id": 1,
        "categoryDetails.title": 1,
        "categoryDetails.description": 1,
        "categoryDetails.coverImage": 1,
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    results: plans.length,
    data: plans,
  });
});

exports.getUsers = catchAsync(async (req, res, next) => {
  const superAdminCount = await User.countDocuments({ role: "super-admin" });

  const users = await User.find().select("name email role number");

  res.status(200).json({
    status: "success",
    data: users,
    superAdminCount,
  });
});

exports.promoteUser = catchAsync(async (req, res, next) => {
  const { userId, role } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required." });
  }

  const user = await User.findById(userId).select("-password");

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  // Check if the role is 'super-admin'
  if (role === "super-admin") {
    // Check the count of super-admins
    const superAdminCount = await User.countDocuments({ role: "super-admin" });

    // If the count is 3, return an error message
    if (superAdminCount >= 3) {
      return res.status(400).json({ message: "Cannot promote more than 3 super-admins." });
    }
  }

  // Update the user's role
  user.role = role;
  await user.save();

  res.status(200).json({ message: "User promoted successfully", user });
});

exports.demoteUser = catchAsync(async (req, res, next) => {
  const { userId, role } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required." });
  }

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  user.role = role;
  await user.save();

  res.status(200).json({ message: "User demoted successfully", user });
});

exports.getTickets = catchAsync(async (req, res, next) => {
  try {
    // Get today's date in ISO format without the time portion
    const today = new Date().setHours(0, 0, 0, 0);

    // Aggregation pipeline to join tickets with plans and categories
    const tickets = await Ticket.aggregate([
      {
        $lookup: {
          from: "plans", // Join with plans collection
          localField: "plan",
          foreignField: "_id",
          as: "planDetails",
        },
      },
      {
        $unwind: "$planDetails", // Deconstruct array field planDetails
      },
      {
        $lookup: {
          from: "categories", // Join with categories collection
          localField: "category",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      {
        $unwind: "$categoryDetails", // Deconstruct array field categoryDetails
      },
      {
        $project: {
          _id: 1, // Include the ticket ID
          "plan.coverImage": "$planDetails.coverImage",
          "plan.title": "$planDetails.title",
          "plan.description": "$planDetails.description",
          "user.name": "$user",
          // Use the string user field directly
          "category.title": "$categoryDetails.title", // Include category title
          totalPrice: "$price",
          uniqueId: "$uniqueId",
          adultQuantity: "$adultQuantity",
          childQuantity: "$childQuantity",
          firstName: "$firstName",
          lastName: "$lastName",
          number: "$number",
          email: "$email",
          pickupLocation: "$pickupLocation",
          dropLocation: "$dropLocation",
          addonFeatures: "$addonFeatures",
          status: 1, // Include the ticket status
          createdAt: 1, // Include the createdAt field
          date: "$date",
          paymentStatus: "$paymentStatus",
          pickupTime: "$pickupTime",
        },
      },
    ]);
    // Send the formatted response
    res.status(200).json({
      status: "success",
      data: tickets,
    });
  } catch (err) {
    console.error("Error:", err);
    return next(new AppError("Internal Server Error", 500));
  }
});
exports.getPlanById = catchAsync(async (req, res, next) => {
  const planId = req.params.planId;
  const plan = await Plan.findById(planId).lean();

  res.status(200).json({
    status: "success",
    results: plan.length,
    data: plan,
  });
});
exports.cancelTicket = catchAsync(async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find the ticket by its ID
    const ticket = await Ticket.findById(id)
      .populate("plan")
      .populate("category");
    console.log("done3 ");

    if (!ticket) {
      return next(new AppError("Ticket not found", 404));
    }

    // console.log(ticket)
    // Update the ticket status to "Canceled"
    ticket.status = "Canceled";
    await ticket.save();

    try {
      const emailContent = `
    <h3 style="font-family: Arial, sans-serif; color: #333;">
        Dear ${ticket?.firstName},
    </h3>
    <p style="font-family: Arial, sans-serif; color: #333;">
        We regret to inform you that your tickets for ${
          ticket.plan.title.en
        } have been canceled. We understand this may be disappointing, and we apologize for any inconvenience this may cause.
    </p>
    <p style="font-family: Arial, sans-serif; color: #333;">
        If you have any questions or need assistance with cancellations or refunds, please check our FAQs page.
    </p>

    <h4 style="font-family: Arial, sans-serif; color: #333;">Here are your ticket details:</h4>
    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
            <tr style="background-color: #f2f2f2;">
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Field</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Details</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">Unique ID</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${ticket?.uniqueId}</td>
            </tr>
            <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">Plan</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${ticket.plan.title.en}</td>
            </tr>
            <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">Price</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${ticket?.price} QAR</td>
            </tr>
            <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">Adult Quantity</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${ticket?.adultQuantity}</td>
            </tr>
            <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">Child Quantity</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${ticket?.childQuantity}</td>
            </tr>
            <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">Session</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${ticket?.session}</td>
            </tr>
            <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">Date</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${new Date(
                  ticket?.date,
                ).toLocaleDateString()}</td>
            </tr>
            <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">Email</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${ticket?.email}</td>
            </tr>
            <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">Pickup Location</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${ticket?.pickupLocation}</td>
            </tr>
      
        </tbody>
    </table>

    <br>
    ${signature}
`;

      await transporter.sendMail({
        to: ticket.email,
        subject: `Dear ${ticket?.firstName}, Your ticket for ${ticket.plan.title.en} has been canceled`,
        html: emailContent,
      });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
    console.log("Email sended!!");
    res.status(200).json({
      status: "success",
      data: {
        ticket,
      },
    });
  } catch (err) {
    console.error("Error:", err);
    return next(new AppError("Internal Server Error", 500));
  }
});
