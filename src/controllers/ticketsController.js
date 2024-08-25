const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

const Plan = require("../models/planModel");
const Ticket = require("../models/ticketModel");

exports.bookTicket = catchAsync(async (req, res, next) => {
  const data = req.body;
  const user = req.user;

  try {
    // Fetch plans based on the IDs provided in the request
    const planIds = data.map((ticket) => ticket.plan);
    const planTypes = await Plan.find({ _id: { $in: planIds } });

    // Log the fetched plans for debugging
    console.log("Fetched Plans:", planTypes);

    // Check if all requested plans are valid
    if (planTypes.length !== new Set(planIds).size) {
      console.log("Invalid or missing plans:", planIds.filter(id => !planTypes.find(plan => plan._id.toString() === id.toString())));
      return next(new AppError("Invalid tickets", 400));
    }

    // Create tickets
    const ticketPromises = data.map((ticket) => {
      const plan = planTypes.find((plan) => plan._id.toString() === ticket.plan.toString());

      if (!plan) {
        console.log("Plan not found:", ticket.plan);
        return next(new AppError("Invalid plan", 400));
      }

      const priceEntry = plan.price.find(p => p.type === ticket.type);

      if (!priceEntry) {
        console.log("Price type not found:", ticket.type);
        return next(new AppError("Price type not found", 400));
      }

      const price = parseFloat(priceEntry.detail[0].replace(' USD', '').replace(',', ''));

      if (isNaN(price)) {
        console.log("Invalid price format:", priceEntry.detail[0]);
        return next(new AppError("Invalid price format", 400));
      }

      return Ticket.create({
        user: user.id,
        category: ticket.category,
        plan: ticket.plan,
        price: price * ticket.quantity,
        quantity: ticket.quantity,
        dates: ticket.dates,
      });
    });

    const ticketResults = await Promise.all(ticketPromises);

    let totalQuantity = 0,
        totalCost = 0;

    for (const t of ticketResults) {
      totalCost += t.price;
      totalQuantity += t.quantity;
    }

    console.log("Booked Tickets:", ticketResults);

    res.status(201).json({
      status: "success",
      data: {
        bookedTickets: ticketResults,
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