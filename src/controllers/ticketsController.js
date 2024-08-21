const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

const Plan = require("../models/planModel");
const Ticket = require("../models/ticketModel");

exports.bookTicket = catchAsync(async (req, res, next) => {
  const data = req.body;
  const user = req.user;

  const planTypes = await Plan.find({ _id: { $in: data.map((plan) => plan.plan) } });

  if (planTypes.length !== data.length) return next(new AppError("Invalid tickets", 400));

  const ticketPromise = data.map((ticket) => {
    return Ticket.create({
      user: user.id,
      category: ticket?.category,
      plan: ticket?.plan,
      price:
        planTypes?.find((plan) => plan._id.toString() === ticket.plan.toString()).price *
        ticket.quantity,
      quantity: ticket?.quantity,
      dates: ticket?.dates,
    });
  });
  const ticketTest = await Promise.all(ticketPromise);

  let totalQuantity = 0,
    totalCost = 0;

  for (t of ticketTest) {
    totalCost += t.price;
    totalQuantity += t.quantity;
  }

  console.log(ticketTest);
  res.status(201).json({
    status: "success",
    data: {
      bookedTickets: ticketTest,
    },
  });
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
