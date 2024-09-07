const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const Plan = require("../models/planModel");
const Category = require("../models/categoryModel");
const Offer = require("../models/offerModel"); // Ensure the path is correct
const User = require("../models/userModel");
const Ticket = require("../models/ticketModel");
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
    <div style="display: flex; align-items: center;">
        <img src="https://dohabus.com/wp-content/uploads/2020/04/Doha-Bus-Logo.png" alt="Signature Image" style="width: 100px; height: 100px; margin-right: 10px;">
        <h1 style="color: yellow; font-size: 2rem; margin: 0;">
            <b>Doha Bus</b>
        </h1>
    </div>
</div>
`;
exports.bookTicket = catchAsync(async (req, res, next) => {
  const {
    date,
    adultQuantity,
    childQuantity,
    session,
    category,
    plan,
    firstName,
    lastName,
    email,
    pickupLocation,
    dropLocation,
    coupon,
  } = req.body;
  const user = req.user;

  try {
    const planDetails = await Plan.findById(plan);
    const planCategory = await Category.findById(category);
    const userDetails = await User.findById(user.id);

    if (!planDetails) {
      return next(new AppError("Invalid plan selected", 400));
    }
    console.log("userDetails", userDetails.name);

    const adultPrice = planDetails.adultPrice || 0;
    const childPrice = planDetails.childPrice || 0;

    let totalCost = adultPrice * adultQuantity + childQuantity * childPrice;
    let adultDiscountAmount = 0;
    let childDiscountAmount = 0;
    if (coupon) {
      const couponDetails = await Offer.findOne({ plan, couponCode: coupon, status: "active" });

      if (!couponDetails) {
        return next(new AppError("Invalid or expired coupon code", 400));
      }

      const currentDate = new Date();
      if (currentDate < couponDetails.startingDate || currentDate > couponDetails.endingDate) {
        return next(new AppError("Coupon code is not valid at this time", 400));
      }

      // Calculate total prices before discount
      const totalAdultPrice = adultPrice * adultQuantity;
      const totalChildPrice = childPrice * childQuantity;

      // Calculate discount for adults
      if (couponDetails.adultDiscountType === "percentage") {
        adultDiscountAmount = (totalAdultPrice * couponDetails.adultDiscountPrice) / 100;
      } else if (couponDetails.adultDiscountType === "price") {
        adultDiscountAmount = couponDetails.adultDiscountPrice * adultQuantity;
      }

      // Calculate discount for children
      if (couponDetails.childDiscountType === "percentage") {
        childDiscountAmount = (totalChildPrice * couponDetails.childDiscountPrice) / 100;
      } else if (couponDetails.childDiscountType === "price") {
        childDiscountAmount = couponDetails.childDiscountPrice * childQuantity;
      }

      const discountedAdultPrice = totalAdultPrice - adultDiscountAmount;
      const discountedChildPrice = totalChildPrice - childDiscountAmount;

      // Calculate the total cost
      totalCost = discountedAdultPrice + discountedChildPrice;
    }
    console.log({
      user: user.id,
      category,
      plan,
      price: totalCost,
      adultQuantity,
      childQuantity,
      session,
      date,
      firstName,
      lastName,
      email,
      pickupLocation,
      dropLocation,
      discountAmount: adultDiscountAmount + childDiscountAmount,
      status: "Booked",
    });
    const ticket = await Ticket.create({
      user: user.id,
      category,
      plan,
      price: totalCost,
      adultQuantity,
      childQuantity,
      session,
      date,
      firstName,
      lastName,
      email,
      pickupLocation,
      dropLocation,
      discountAmount: adultDiscountAmount + childDiscountAmount,
      status: "Booked",
    });

    // try {
    //   const emailContent = `
    //     <h3 style="font-family: Arial, sans-serif; color: #333;">
    //         Hello ${userDetails.name},
    //     </h3>
    //     <p style="font-family: Arial, sans-serif; color: #333;">
    //         Thank you for purchasing tickets for ${planDetails.title.en}. We are thrilled to have you join us for this exciting event.
    //         Your support means a lot to us, and we are committed to providing you with an unforgettable experience.
    //         From the moment you arrive, we hope you enjoy the vibrant atmosphere, engaging performances, and the overall ambiance
    //         that makes this event special. We look forward to seeing you and hope you have a fantastic time!
    //     </p>
    //     <p style="font-family: Arial, sans-serif; color: #333;">
    //         Here are the purchase details:
    //     </p>
    //     <h4 style="font-family: Arial, sans-serif; color: #333;">
    //         Tour Name: ${planDetails.title.en}
    //     </h4>
    //     <h4 style="font-family: Arial, sans-serif; color: #333;">
    //         Number Of Tickets: ${totalQuantity}
    //     </h4>
    //     <h4 style="font-family: Arial, sans-serif; color: #333;">
    //         Total Amount: ${totalCost} QAR
    //     </h4>
    //     <h4 style="font-family: Arial, sans-serif; color: #333;">
    //         Category: ${planCategory.title.en}
    //     </h4>
    //     <br>
    //     ${signature}
    // `;

    //   await transporter.sendMail({
    //     to: user.email,
    //     subject: `Hello ${userDetails.name}, Thank you for purchasing ${planDetails.title.en} tickets`,
    //     html: emailContent,
    //   });
    //   console.log("Email has been sent");
    // } catch (error) {
    //   console.log(error.message);
    //   return res.status(400).json({ message: error.message });
    // }

    res.status(201).json({
      status: "success",
      data: {
        bookedTickets: ticket,
        // totalQuantity,
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

exports.getTicketCounts = catchAsync(async (req, res, next) => {
  try {
    const { date, planId } = req.body;

    // Check if date and planId are provided
    if (!date || !planId) {
      return res.status(400).json({ message: "Date and Plan ID are required" });
    }

    // Convert the provided date to a JavaScript Date object
    const targetDate = new Date(date);

    // Find the plan to get available sessions and limit
    const plan = await Plan.findById(planId);

    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    // Get the limit from the plan (0 means no limit)
    const sessionLimit = plan.limit;

    // Initialize the session counts with 0 for each session
    const sessionCounts = {};
    const sessionStatus = {}; // This will hold the status of each session (full or available)
    plan.sessions.forEach((session) => {
      sessionCounts[session] = 0;
      sessionStatus[session] = "Available"; // Default status
    });

    // Find tickets for the given date and planId
    const tickets = await Ticket.find({
      plan: planId,
      date: targetDate,
      status: "Booked",
    });

    // Count the tickets for each session
    tickets.forEach((ticket) => {
      if (sessionCounts.hasOwnProperty(ticket.session)) {
        sessionCounts[ticket.session] += ticket.adultQuantity + ticket.childQuantity;
      }
    });

    // Check the counts against the limit for each session
    plan.sessions.forEach((session) => {
      if (sessionLimit > 0 && sessionCounts[session] >= sessionLimit) {
        sessionStatus[session] = "Full";
      }
    });

    return res.status(200).json({ sessionCounts, sessionStatus });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
});
