const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

const Plan = require("../models/planModel");
const Ticket = require("../models/ticketModel");

exports.bookTicket = catchAsync(async (req, res, next) => {
  const { date, adultQuantity, childQuantity, session, category, plan } = req.body;
  const user = req.user; // Assuming req.user is populated with authenticated user information

  console.log(req.body);
  console.log(user);

  try {
    const planDetails = await Plan.findById(plan);
    if (!planDetails) {
      return next(new AppError("Invalid plan selected", 400));
    }

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
