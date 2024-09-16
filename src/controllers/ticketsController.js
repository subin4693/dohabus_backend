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
    <div style="display: flex; align-items: center; justify-content:center;">
       <div> <img src="https://eng.dohabus.com/English/images/LOGOFOOTER.png" alt="Signature Image" style="width: 100px; height: 100px; margin-right: 10px; object-fit: cover;"></div>
       <div> <h1 style="color: yellow; font-size: 2rem; margin: 0;">
       <b>Doha Bus</b>
   </h1></div>
    </div>
</div>
`;
exports.bookTicket = catchAsync(async (req, res, next) => {
  const {
    date,
    adultQuantity = 0,
    childQuantity = 0,
    session,
    category,
    plan,
    firstName,
    lastName,
    email,
    pickupLocation,
    dropLocation,
    coupon,
    addons,
    number
  } = req.body;

  console.log("addons", addons);

  try {
    const planDetails = await Plan.findById(plan);
    const planCategory = await Category.findById(category);
    const userDetails = { name: firstName + lastName };

    if (!planDetails) {
      return next(new AppError("Invalid plan selected", 400));
    }
    console.log("userDetails", userDetails.name);
    const { adultPrice, childPrice, adultData, childData } = planDetails;
    const sessionLimit = planDetails.limit;

    const targetDate = new Date(date);
    const tickets = await Ticket.find({
      plan: plan,
      session: session,
      date: targetDate,
      status: "Booked",
    });

    let totalBookedTickets = 0;
    tickets.forEach((ticket) => {
      totalBookedTickets += ticket.adultQuantity + ticket.childQuantity;
    });

    const totalNewTickets = adultQuantity + childQuantity;

    if (sessionLimit > 0 && totalBookedTickets + totalNewTickets > sessionLimit) {
      const availableTickets = sessionLimit - totalBookedTickets;
      return res.status(400).json({
        message: `Only ${availableTickets} tickets are available for this session.`,
      });
    }

    let totalAdultPrice = 0,
      totalChildPrice = 0;

    if (adultPrice || childPrice) {
      totalAdultPrice = adultPrice * adultQuantity || 0;
      totalChildPrice = childPrice * childQuantity || 0;
    } else {
      // Case 2: Calculate prices based on adultData and childData if adultPrice and childPrice are not present

      // Adult Data Calculation
      if (adultData && adultQuantity > 0) {
        const sortedAdultData = adultData.sort((a, b) => a.pax - b.pax); // Sort by pax ascending
        const selectedAdultData = sortedAdultData
          .filter((adult) => adult.pax <= adultQuantity)
          .pop(); // Get the closest pax <= adultQuantity

        totalAdultPrice = selectedAdultData ? selectedAdultData.price * adultQuantity : 0; // Use the selected price and multiply by adultQuantity
      }

      // Child Data Calculation
      if (childData && childQuantity > 0) {
        const sortedChildData = childData.sort((a, b) => a.pax - b.pax); // Sort by pax ascending
        const selectedChildData = sortedChildData
          .filter((child) => child.pax <= childQuantity)
          .pop(); // Get the closest pax <= childQuantity

        totalChildPrice = selectedChildData ? selectedChildData.price * childQuantity : 0; // Use the selected price and multiply by childQuantity
      }
    }

    console.log(totalAdultPrice);
    console.log(totalChildPrice);

    let totalCost = totalAdultPrice + totalChildPrice;
    console.log("totlal cost" + totalCost);
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

      // Calculate discount for adults
      if (couponDetails.adultDiscountType === "percentage" && adultQuantity > 0) {
        adultDiscountAmount = (totalAdultPrice * couponDetails.adultDiscountPrice) / 100;
      } else if (couponDetails.adultDiscountType === "price" && adultQuantity > 0) {
        adultDiscountAmount = couponDetails.adultDiscountPrice;
        console.log("adult discount amount" + adultDiscountAmount);
      }

      // Calculate discount for children
      if (couponDetails.childDiscountType === "percentage" && childQuantity > 0) {
        childDiscountAmount = (totalChildPrice * couponDetails.childDiscountPrice) / 100;
      } else if (couponDetails.childDiscountType === "price" && childQuantity > 0) {
        childDiscountAmount = couponDetails.childDiscountPrice;
      }

      const discountedAdultPrice = totalAdultPrice - adultDiscountAmount || 0;
      const discountedChildPrice = totalChildPrice - childDiscountAmount || 0;

      // Calculate the total cost
      totalCost = discountedAdultPrice + discountedChildPrice;

      console.log(totalAdultPrice);
      console.log(totalChildPrice);
      console.log(discountedAdultPrice);
      console.log(discountedChildPrice);
      console.log(totalCost);
      console.log(adultDiscountAmount + "-" + childDiscountAmount);
    }
    let addOnTotalPrice = 0;
    let addonFeatures = [];
    if (addons?.length > 0 && planDetails?.addOn?.length > 0) {
      addons.forEach((addOnId) => {
        const matchingAddOn = planDetails?.addOn?.find((addOn) => addOn._id == addOnId);
        addonFeatures.push(matchingAddOn?.en);
        if (matchingAddOn) {
          addOnTotalPrice += matchingAddOn.price;
        }
      });
      console.log("addOnTotalPrice+++++++++++1", addOnTotalPrice);
      // Multiply the add-on total by the adultCount and childCount
      let tt = 0;
      if (childQuantity && childQuantity > 0) tt += childQuantity;
      if (adultQuantity && adultQuantity > 0) tt += adultQuantity;
      addOnTotalPrice = addOnTotalPrice * tt;
      console.log("addOnTotalPrice+++++++++++", addOnTotalPrice);
      console.log("total cost" + totalCost);
    }

    console.log({
      user: userDetails.name,
      category,
      plan,
      price: totalCost + addOnTotalPrice || 0,
      adultQuantity: adultQuantity || 0,
      childQuantity: childQuantity || 0,
      session,
      date,
      firstName,
      lastName,
      email,
      pickupLocation,
      dropLocation,
      discountAmount: adultDiscountAmount + childDiscountAmount || 0,
      status: "Booked",
      addonFeatures,
      number
    });

    let allcost = totalCost + addOnTotalPrice;
    console.log("Cost?????????????????????/", allcost);
    const ticket = await Ticket.create({
      user: userDetails.name,
      category,
      plan,
      price: totalCost + addOnTotalPrice || 0,
      adultQuantity: adultQuantity || 0,
      childQuantity: childQuantity || 0,
      session,
      date,
      firstName,
      lastName,
      email,
      pickupLocation,
      dropLocation,
      discountAmount: adultDiscountAmount + childDiscountAmount || 0,
      addonFeatures,
      status: "Booked",
      number
    });

    try {
      const emailContent = `
        <h3 style="font-family: Arial, sans-serif; color: #333;">
            Hello ${userDetails.name},
        </h3>
        <p style="font-family: Arial, sans-serif; color: #333;">
            Thank you for purchasing tickets for ${planDetails.title.en
        }. We are thrilled to have you join us for this exciting event.
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
            Number Of Tickets: ${adultQuantity + childQuantity}
        </h4>
        <h4 style="font-family: Arial, sans-serif; color: #333;">
            Total Amount: ${allcost} QAR
        </h4>
        <h4 style="font-family: Arial, sans-serif; color: #333;">
            Category: ${planCategory.title.en}
        </h4>

        <p style="font-family: Arial, sans-serif; color: #333;">
        We greatly value your recent experience with us. If you were pleased with our service, we would be honored if you could share your feedback by leaving a review on TripAdvisor. Your insights are invaluable in helping us continue to provide excellent service.<br>
        [https://www.tripadvisor.com/Attraction_Review-g294009-d6215547-Reviews-Doha_Bus-Doha.html]
        </p>
    
        <br>
        ${signature}
    `;
      const emailContentFordohabus = `
    <h3 style="font-family: Arial, sans-serif; color: #333;">
        Dear DohaBus Team,
    </h3>
    <p style="font-family: Arial, sans-serif; color: #333;">
        We would like to inform you that a new booking has been made on your website by ${userDetails.name}.
    </p>
    <p style="font-family: Arial, sans-serif; color: #333;">
        Below are the details of the purchase:
    </p>
    <h4 style="font-family: Arial, sans-serif; color: #333;">
        Tour Name: ${planDetails.title.en}
    </h4>
    <h4 style="font-family: Arial, sans-serif; color: #333;">
        Number Of Tickets: ${adultQuantity + childQuantity}
    </h4>
    <h4 style="font-family: Arial, sans-serif; color: #333;">
        Total Amount: ${allcost} QAR
    </h4>
    <h4 style="font-family: Arial, sans-serif; color: #333;">
        Category: ${planCategory.title.en}
    </h4>
    <p style="font-family: Arial, sans-serif; color: #333;">
        Please ensure all necessary arrangements are made to accommodate this booking. Feel free to reach out if any further details are required.
    </p>
    <p style="font-family: Arial, sans-serif; color: #333;">
        Thank you for your attention.
    </p>
    <br>
    ${signature}
  `;


      await transporter.sendMail({
        to: email,
        subject: `Hello ${userDetails.name}, Thank you for purchasing ${planDetails.title.en} tickets`,
        html: emailContent,
      });
      await transporter.sendMail({
        to: process.env.COMPANY_EMAIL,
        subject: `Ticket Booked By ${userDetails.name},Plan ${planDetails.title.en} tickets`,
        html: emailContentFordohabus,
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
  console.log(userId);
  const tickets = await Ticket.find({ user: userId });
  console.log(tickets);
  res.status(200).json({
    status: "success",
    data: {
      tickets,
    },
  });
});

exports.getAllTickets = catchAsync(async (req, res, next) => {
  const tickets = await Ticket.find()
    .populate({
      path: "plan",
      select: "title coverImage",
    })
    .populate({
      path: "category",
      select: "title description",
    })
    .select(
      "firstName lastName email category plan price adultQuantity childQuantity date status pickupLocation dropLocation",
    ); // Including firstName and lastName in the ticket query

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
      } else if (sessionLimit > 0 && sessionCounts[session] >= sessionLimit / 2) {
        sessionStatus[session] = "Filling Up";
      }
    });

    return res.status(200).json({ sessionCounts, sessionStatus });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
});

exports.getTicketById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const ticket = await Ticket.findById(id);
  const plan = await Plan.findById(ticket.plan);
  const planCategory = await Category.findById(ticket.category);
  // console.log(plan)

  if (!ticket) {
    return next(new AppError("Ticket not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      ticket,
      plan,
      planCategory,
    },
  });
});
