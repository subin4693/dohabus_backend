const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const Plan = require("../models/planModel");
const Category = require("../models/categoryModel");
const User = require("../models/userModel");
const Ticket = require("../models/ticketModel");
const nodemailer = require('nodemailer');
const dotenv = require("dotenv");
dotenv.config();
dotenv.config({ path: "dohabus_backend/.env" });
const transporter = nodemailer.createTransport({
  service: 'Gmail',
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
    <div style="display: flex; align-items: center;">
        <img src="https://dohabus.com/wp-content/uploads/2020/04/Doha-Bus-Logo.png" alt="Signature Image" style="width: 100px; height: 100px; margin-right: 10px;">
        <h1 style="color: yellow; font-size: 2rem; margin: 0;">
            <b>Doha Bus</b>
        </h1>
    </div>
</div>
`;
exports.bookTicket = catchAsync(async (req, res, next) => {
  const { date, adultQuantity, childQuantity, session, category, plan } = req.body;
  const user = req.user;

  try {
    const planDetails = await Plan.findById(plan);
    const planCategory = await Category.findById(category);
    const userDetails = await User.findById(user.id);
    if (!planDetails) {
      return next(new AppError("Invalid plan selected", 400));
    }
    console.log("userDetails", userDetails.name)
    const adultPrice = planDetails.adultPrice || 0;
    const childPrice = planDetails.childPrice || 0;

    const totalCost = adultPrice * adultQuantity + childPrice * childQuantity;
    const totalQuantity = adultQuantity + childQuantity;

    const ticket = await Ticket.create({
      user: user.id,
      category,
      plan,
      price: totalCost,
      adultQuantity,
      childQuantity,
      session,
      date,
      status: "Booked",
    });
    // console.log(transporter)
    try {


      const emailContent = `
        <h3 style="font-family: Arial, sans-serif; color: #333;">
            Hello ${userDetails.name},
        </h3>
        <p style="font-family: Arial, sans-serif; color: #333;">
            Thank you for purchasing tickets for ${planDetails.title.en}. We are thrilled to have you join us for this exciting event. 
            Your support means a lot to us, and we are committed to providing you with an unforgettable experience. 
            From the moment you arrive, we hope you enjoy the vibrant atmosphere, engaging performances, and the overall ambiance 
            that makes this event special. We look forward to seeing you and hope you have a fantastic time!
        </p>
        <p style="font-family: Arial, sans-serif; color: #333;">
            Here are the purchase details:
        </p>
        <h4 style="font-family: Arial, sans-serif; color: #333;">
            Tour Name: ${planDetails.title.en}
        </h4>
        <h4 style="font-family: Arial, sans-serif; color: #333;">
            Number Of Tickets: ${totalQuantity}
        </h4>
        <h4 style="font-family: Arial, sans-serif; color: #333;">
            Total Amount: ${totalCost} QAR
        </h4>
        <h4 style="font-family: Arial, sans-serif; color: #333;">
            Category: ${planCategory.title.en}
        </h4>
        <br>
        ${signature}
    `;


      await transporter.sendMail({
        to: user.email,
        subject: `Hello ${userDetails.name}, Thank you for purchasing ${planDetails.title.en} tickets`,
        html: emailContent
      });
      console.log("Email has been sent");
    } catch (error) {
      console.log(error.message);
      return res.status(400).json({ message: error.message });
    }

    res.status(201).json({
      status: "success",
      data: {
        bookedTickets: ticket,
        totalQuantity,
        totalCost,
      },
    });
  } catch (err) {
    console.error("Error:", err);
    return next(new AppError("Internal Server Error", 500));
  }
});

exports.getTickets = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const tickets = await Ticket.find({ user: userId });
  console.log(tickets);
  res.status(200).json({
    status: "success",
    data: {
      tickets,
    },
  });
});

exports.deleteTicket = catchAsync(async (req, res, next) => {
  const ticketId = req.params.id;
  await Ticket.findByIdAndUpdate(ticketId, { status: "Canceled" });
  res.status(200).json({
    status: "success",
  });
});

exports.editTicket = catchAsync(async (req, res, next) => {
  const ticketId = req.params.id;
  const data = req.body;

  const planTypes = await Plan.find({ _id: { $in: data.map((plan) => plan.plan) } });

  if (planTypes.length !== data.length) return next(new AppError("Invalid tickets", 400));

  const ticketPromise = data.map((ticket) => {
    return Ticket.findByIdAndUpdate(
      ticketId,
      {
        category: ticket?.category,
        plan: ticket?.plan,
        price:
          planTypes?.find((plan) => plan._id.toString() === ticket.plan.toString()).price *
          ticket.quantity,
        quantity: ticket?.quantity,
        dates: ticket?.dates,
      },
      { new: true },
    );
  });
  const ticketTest = await Promise.all(ticketPromise);

  let totalQuantity = 0,
    totalCost = 0;

  for (t of ticketTest) {
    totalCost += t.price;
    totalQuantity += t.quantity;
  }

  res.status(201).json({
    status: "success",
    data: {
      bookedTickets: ticketTest,
    },
  });
});
