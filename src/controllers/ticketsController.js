const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const Plan = require("../models/planModel");
const Category = require("../models/categoryModel");
const Offer = require("../models/offerModel"); // Ensure the path is correct
const User = require("../models/userModel");
const Ticket = require("../models/ticketModel");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const { v4: uuidv4 } = require("uuid"); // Ensure that 'uuid' is installed properly
const CryptoJS = require("crypto-js");
const crypto = require("crypto");
const generatePaymentRequestSKIP = require("../utils/generatePayment");
dotenv.config();
dotenv.config({ path: "dohabus_backend/.env" });

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});
const paymentGatewayDetails = {
  sandboxURL: "https://skipcashtest.azurewebsites.net",
  productionURL: "https://api.skipcash.app",
  secretKey: process.env.SKIP_CASH_KEY_SECRET,
  keyId: process.env.SKIP_CASH_KEY_ID,
  clientId: process.env.SKIP_CASH_CLIENT_ID,
};
const WEBHOOK_KEY = process.env.SKIP_CASH_WEBHOOK_KEY;
function calculateSignature(payload) {
  const fields = ["PaymentId", "Amount", "StatusId", "TransactionId", "Custom1", "VisaId"];
  const data = fields
    .filter((field) => payload[field] != null)
    .map((field) => `${field}=${payload[field]}`)
    .join(",");

  const hmac = CryptoJS.HmacSHA256(data, WEBHOOK_KEY);
  return CryptoJS.enc.Base64.stringify(hmac);
}
const esignature = `
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
    number,
    pickupTime,
  } = req.body.dataa;

  try {
    const planDetails = await Plan.findById(plan);
    const planCategory = await Category.findById(category);
    const userDetails = { name: firstName };

    if (!planDetails) {
      return next(new AppError("Invalid plan selected", 400));
    }

    const planObject = planDetails.toObject();

    const { adultPrice, childPrice, adultData, childData, minPerson } = planObject;
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

    if (minPerson > 0 && minPerson > adultQuantity + childQuantity) {
      return res.status(400).json({
        message: `The minimum persons count should be ${minPerson}. You have selected ${adultQuantity +
          childQuantity}`,
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
        const sortedAdultData = adultData.sort((a, b) => a.pax - b.pax);
        const minAdultPax = sortedAdultData[0]?.pax; // Get the minimum pax from sortedAdultData

        if (adultQuantity < minAdultPax) {
          return res.status(400).json({
            message: `The minimum adult count should be ${minAdultPax}. You have selected ${adultQuantity}.`,
          });
        }
        const selectedAdultData = sortedAdultData
          .filter((adult) => adult.pax <= adultQuantity)
          .pop(); // Get the closest pax <= adultQuantity

        totalAdultPrice = selectedAdultData ? selectedAdultData.price * adultQuantity : 0; // Use the selected price and multiply by adultQuantity
      }

      // Child Data Calculation
      if (childData && childQuantity > 0) {
        const sortedChildData = childData.sort((a, b) => a.pax - b.pax);
        const minChildPax = sortedChildData[0]?.pax; // Get the minimum pax from sortedChildData

        // Check if childQuantity is greater than or equal to the minimum pax
        if (childQuantity < minChildPax) {
          return res.status(400).json({
            message: `The minimum child count should be ${minChildPax}. You have selected ${childQuantity}.`,
          });
        }
        const selectedChildData = sortedChildData
          .filter((child) => child.pax <= childQuantity)
          .pop(); // Get the closest pax <= childQuantity

        totalChildPrice = selectedChildData ? selectedChildData.price * childQuantity : 0; // Use the selected price and multiply by childQuantity
      }
    }

    let totalCost = totalAdultPrice + totalChildPrice;

    // Coupon logic
    let adultDiscountAmount = 0;
    let childDiscountAmount = 0;
    let offer = null;
    if (coupon) {
      const couponDetails = await Offer.findOne({ plan, couponCode: coupon, status: "active" });
      if (!couponDetails) {
        return next(new AppError("Invalid or expired coupon code", 400));
      }

      const { limit } = couponDetails;
      const userTicketCount = await Ticket.countDocuments({
        plan,
        offer: couponDetails._id,
        email,
      });

      if (userTicketCount >= limit && limit > 0) {
        return next(new AppError(`Coupon code can only be used ${limit} time(s) per user`, 400));
      }

      offer = couponDetails._id;
      const currentDate = new Date();
      if (currentDate < couponDetails.startingDate || currentDate > couponDetails.endingDate) {
        return next(new AppError("Coupon code is not valid at this time", 400));
      }

      // Calculate discount for adults
      if (couponDetails.adultDiscountType === "percentage" && adultQuantity > 0) {
        adultDiscountAmount = (totalAdultPrice * couponDetails.adultDiscountPrice) / 100;
      } else if (couponDetails.adultDiscountType === "price" && adultQuantity > 0) {
        adultDiscountAmount = couponDetails.adultDiscountPrice;
      }

      // Calculate discount for children
      if (couponDetails.childDiscountType === "percentage" && childQuantity > 0) {
        childDiscountAmount = (totalChildPrice * couponDetails.childDiscountPrice) / 100;
      } else if (couponDetails.childDiscountType === "price" && childQuantity > 0) {
        childDiscountAmount = couponDetails.childDiscountPrice;
      }

      const discountedAdultPrice = totalAdultPrice - adultDiscountAmount || 0;
      const discountedChildPrice = totalChildPrice - childDiscountAmount || 0;
      totalCost = discountedAdultPrice + discountedChildPrice;
    }

    // Add-on price calculations
    let addOnTotalPrice = 0;
    let addonFeatures = [];
    if (addons?.length > 0 && planDetails?.addOn?.length > 0) {
      addons.forEach((addOnId) => {
        const [addId, count] = addOnId.split(":");
        const matchingAddOn = planDetails?.addOn?.find((addOn) => addOn._id == addId);
        addonFeatures.push(matchingAddOn?.en);

        if (matchingAddOn) {
          const addOnCount = parseInt(count, 10) || 1;
          addOnTotalPrice += matchingAddOn.price * addOnCount;
        }
      });
      let tt = 0;
      if (childQuantity && childQuantity > 0) tt += childQuantity;
      if (adultQuantity && adultQuantity > 0) tt += adultQuantity;
    }

    const latestTicket = await Ticket.findOne().sort({ uniqueId: -1 });
    const newIdNumber = latestTicket ? parseInt(latestTicket.uniqueId) + 1 : 1;

    const newUniqueId = String(newIdNumber).padStart(5, "0");

    const allcost = totalCost + addOnTotalPrice;
    console.log("All Cost is", allcost);
    const transactionId = `TRX-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 15)}`;

    // Payment processing
    const paymentDetails = {
      Uid: uuidv4(),
      KeyId: paymentGatewayDetails.keyId,
      Amount: allcost.toFixed(2),
      FirstName: firstName,
      LastName: "Sir",
      Phone: number,
      Email: email,
      TransactionId: transactionId,
      Custom1: "ticket-booking",
    };
    console.log("Key is id is", paymentGatewayDetails.keyId);

    const paymentResult = await generatePaymentRequestSKIP(paymentDetails);
    console.log("Payment Result: ", paymentResult);

    const payUrl = paymentResult?.payUrl;
    console.log("Pay URL: ", payUrl);

    if (!payUrl) {
      return res.status(500).json({ message: "Failed to generate payment URL" });
    }

    // Ticket creation
    const ticket = await Ticket.create({
      // user: userDetails.name,
      uniqueId: newUniqueId,
      category,
      plan,
      price: totalCost + addOnTotalPrice || 0,
      adultQuantity: adultQuantity || 0,
      childQuantity: childQuantity || 0,
      session,
      date,
      firstName,
      offer,
      transactionId,
      paymentStatus: "Pending",
      email,
      pickupLocation,
      dropLocation,
      discountAmount: adultDiscountAmount + childDiscountAmount || 0,
      addonFeatures,
      status: "Booked",
      number,
      pickupTime,
    });

    res.status(200).json({
      message: "Booking initiated",
      data: {
        bookedTickets: ticket,
        ticketId: ticket._id,
        payUrl: payUrl,
      },
    });
  } catch (error) {
    console.error("Booking failed: ", error.message);
    next(new AppError(error.message, 500));
  }
});

exports.handleWebhook = async (req, res) => {
  try {
    console.log("Web Hook Called----");
    const { PaymentId, Amount, StatusId, TransactionId, Custom1, VisaId } = req.body;
    const authHeader = req.headers["authorization"];
    console.log("Webhook auth heade ris", authHeader);
    if (!PaymentId || !Amount || !StatusId || !TransactionId) {
      return res.status(400).json({
        success: false,
        message: "Invalid webhook data.",
      });
    }
    const calculatedSignature = calculateSignature(req.body);
    console.log("Calculated Signature is", calculatedSignature);
    if (authHeader !== calculatedSignature) {
      return res.status(401).json({
        success: false,
        message: "Invalid signature.",
      });
    }

    // Populate user.populate('plan')      // Populate plan.populate('category');;
    const ticket = await Ticket.findOne({ transactionId: TransactionId })
      // .populate('user')      // Populate user
      .populate("plan") // Populate plan
      .populate("category");

    console.log("Booking found for ticket:", ticket);

    if (ticket) {
      ticket.paymentStatus = StatusId === 2 ? "Paid" : "Failed";
      ticket.visaId = VisaId;
      await ticket.save();
      console.log("Booking updated:", ticket);

      if (StatusId === 2) {
        console.log("Payment successful, preparing email");

        // Sending emails
        const emailContent = `
        <h3 style="font-family: Arial, sans-serif; color: #333;">
          Hello ${ticket?.firstName} ${ticket?.lastName},
        </h3>
        <p style="font-family: Arial, sans-serif; color: #333;">
          Thank you for purchasing tickets for ${
            ticket?.plan?.title?.en
          }. We are thrilled to have you join us for this exciting event. Your support means a lot to us, and we are committed to providing you with an unforgettable experience. From the moment you arrive, we hope you enjoy the vibrant atmosphere, engaging performances, and the overall ambiance that makes this event special. We look forward to seeing you and hope you have a fantastic time!
        </p>
      
        <p style="font-family: Arial, sans-serif; color: #333;">
          Here are the purchase details:
        </p>
      
        <table style="font-family: Arial, sans-serif; color: #333; border-collapse: collapse; width: 100%;">
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;"><strong>Unique Id:</strong></td>
            <td style="border: 1px solid #ccc; padding: 8px;">${ticket?.uniqueId}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;"><strong>Tour Name:</strong></td>
            <td style="border: 1px solid #ccc; padding: 8px;">${ticket?.plan?.title?.en}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;"><strong>Number Of Adults:</strong></td>
            <td style="border: 1px solid #ccc; padding: 8px;">${ticket?.adultQuantity}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;"><strong>Number Of Children:</strong></td>
            <td style="border: 1px solid #ccc; padding: 8px;">${ticket?.childQuantity}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;"><strong>Number Of Tickets:</strong></td>
            <td style="border: 1px solid #ccc; padding: 8px;">${ticket?.adultQuantity +
              ticket?.childQuantity}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;"><strong>Total Amount:</strong></td>
            <td style="border: 1px solid #ccc; padding: 8px;">${ticket?.price} QAR</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;"><strong>Pick Up Location:</strong></td>
            <td style="border: 1px solid #ccc; padding: 8px;">${ticket?.pickupLocation}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;"><strong>Pickup Time:</strong></td>
            <td style="border: 1px solid #ccc; padding: 8px;">${ticket?.pickupTime}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;"><strong>Category:</strong></td>
            <td style="border: 1px solid #ccc; padding: 8px;">${ticket?.category?.title?.en}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;"><strong>Add On:</strong></td>
            <td style="border: 1px solid #ccc; padding: 8px;">${ticket?.addonFeatures?.join(", ") ||
              "None"}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;"><strong>Session:</strong></td>
            <td style="border: 1px solid #ccc; padding: 8px;">${ticket?.session}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;"><strong>Date:</strong></td>
            <td style="border: 1px solid #ccc; padding: 8px;">${new Date(
              ticket.date,
            ).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;"><strong>Phone Number:</strong></td>
            <td style="border: 1px solid #ccc; padding: 8px;">${ticket?.number}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;"><strong>Email:</strong></td>
            <td style="border: 1px solid #ccc; padding: 8px;">${ticket?.email}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;"><strong>Status:</strong></td>
            <td style="border: 1px solid #ccc; padding: 8px;">${ticket?.status}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;"><strong>Payment Status:</strong></td>
            <td style="border: 1px solid #ccc; padding: 8px;">${ticket?.paymentStatus}</td>
          </tr>
        </table>
      
        <p style="font-family: Arial, sans-serif; color: #333;">
          <a 
            href="https://dohabus.com/invoice/${ticket?._id}" 
            style="color: #007bff; text-decoration: none; font-weight: bold;"
            target="_blank"
            rel="noopener noreferrer"
          >
            Download Invoice from here
          </a>
        </p>
      
        <p style="font-family: Arial, sans-serif; color: #333;">
          We greatly value your recent experience with us. If you were pleased with our service, we would be honored if you could share your feedback by leaving a review on TripAdvisor. Your insights are invaluable in helping us continue to provide excellent service.<br>
          [https://www.tripadvisor.com/Attraction_Review-g294009-d6215547-Reviews-Doha_Bus-Doha.html]
        </p>
      
        <br>
        ${esignature}
      `;

        console.log("Email sent to user");
        const emailContentFordohabus = `
  <h3 style="font-family: Arial, sans-serif; color: #333;">
    New Ticket Purchase Notification
  </h3>

  <p style="font-family: Arial, sans-serif; color: #333;">
    Dear Team,
  </p>

  <p style="font-family: Arial, sans-serif; color: #333;">
    We are pleased to inform you about a new ticket purchase. Here are the details:
  </p>

  <table style="font-family: Arial, sans-serif; color: #333; border-collapse: collapse; width: 100%;">
    <tr>
      <td style="border: 1px solid #ccc; padding: 8px;"><strong>Customer Name:</strong></td>
      <td style="border: 1px solid #ccc; padding: 8px;">${ticket?.firstName} ${
          ticket?.lastName
        }</td>
    </tr>
    <tr>
      <td style="border: 1px solid #ccc; padding: 8px;"><strong>Email:</strong></td>
      <td style="border: 1px solid #ccc; padding: 8px;">${ticket?.email}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #ccc; padding: 8px;"><strong>Phone Number:</strong></td>
      <td style="border: 1px solid #ccc; padding: 8px;">${ticket?.number}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #ccc; padding: 8px;"><strong>Unique Id:</strong></td>
      <td style="border: 1px solid #ccc; padding: 8px;">${ticket?.uniqueId}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #ccc; padding: 8px;"><strong>Tour Name:</strong></td>
      <td style="border: 1px solid #ccc; padding: 8px;">${ticket?.plan?.title?.en}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #ccc; padding: 8px;"><strong>Selected Plan:</strong></td>
      <td style="border: 1px solid #ccc; padding: 8px;">${ticket?.plan?.title?.en}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #ccc; padding: 8px;"><strong>Category:</strong></td>
      <td style="border: 1px solid #ccc; padding: 8px;">${ticket?.category?.title?.en}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #ccc; padding: 8px;"><strong>Session:</strong></td>
      <td style="border: 1px solid #ccc; padding: 8px;">${ticket?.session}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #ccc; padding: 8px;"><strong>Date:</strong></td>
      <td style="border: 1px solid #ccc; padding: 8px;">${new Date(ticket?.date).toLocaleDateString(
        "en-US",
        {
          year: "numeric",
          month: "long",
          day: "numeric",
        },
      )}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #ccc; padding: 8px;"><strong>Number Of Adults:</strong></td>
      <td style="border: 1px solid #ccc; padding: 8px;">${ticket?.adultQuantity}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #ccc; padding: 8px;"><strong>Number Of Children:</strong></td>
      <td style="border: 1px solid #ccc; padding: 8px;">${ticket?.childQuantity}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #ccc; padding: 8px;"><strong>Number Of Tickets:</strong></td>
      <td style="border: 1px solid #ccc; padding: 8px;">${ticket?.adultQuantity +
        ticket?.childQuantity}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #ccc; padding: 8px;"><strong>Total Amount:</strong></td>
      <td style="border: 1px solid #ccc; padding: 8px;">${ticket?.price} QAR</td>
    </tr>
    <tr>
      <td style="border: 1px solid #ccc; padding: 8px;"><strong>Pick Up Location:</strong></td>
      <td style="border: 1px solid #ccc; padding: 8px;">${ticket?.pickupLocation}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #ccc; padding: 8px;"><strong>Pickup Time:</strong></td>
      <td style="border: 1px solid #ccc; padding: 8px;">${ticket?.pickupTime}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #ccc; padding: 8px;"><strong>Add On:</strong></td>
      <td style="border: 1px solid #ccc; padding: 8px;">${ticket?.addonFeatures?.join(", ") ||
        "None"}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #ccc; padding: 8px;"><strong>Status:</strong></td>
      <td style="border: 1px solid #ccc; padding: 8px;">${ticket?.status}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #ccc; padding: 8px;"><strong>Payment Status:</strong></td>
      <td style="border: 1px solid #ccc; padding: 8px;">${ticket?.paymentStatus}</td>
    </tr>
  </table>

  <p style="font-family: Arial, sans-serif; color: #333;">
    You can view the customer's invoice details by clicking the link below:
  </p>

  <p style="font-family: Arial, sans-serif; color: #333;">
    <a 
      href="https://dohabus.com/invoice/${ticket?._id}" 
      style="color: #007bff; text-decoration: none; font-weight: bold;"
      target="_blank"
      rel="noopener noreferrer"
    >
      Customer Invoice Details
    </a>
  </p>

  <p style="font-family: Arial, sans-serif; color: #333;">
    Best regards,<br>
    Doha Bus
  </p>
`;

        console.log("Email sent to Company");
        await transporter.sendMail({
          to: ticket.email,
          subject: `Hello ${ticket?.firstName}, Thank you for purchasing ${ticket?.plan?.title?.en} tickets`,
          html: emailContent,
        });

        await transporter.sendMail({
          to: process.env.COMPANY_EMAIL,
          subject: `Ticket Booked By ${ticket?.firstName},Plan ${ticket?.plan?.title?.en} tickets`,
          html: emailContentFordohabus,
        });
      } else {
        console.log("Payment not successful, status:", StatusId);

        // Prepare cancellation email content
        const cancellationEmailContent = `
            <h3 style="font-family: Arial, sans-serif; color: #333;">
                Hello ${ticket?.firstName},
            </h3>
            <p style="font-family: Arial, sans-serif; color: #333;">
                We regret to inform you that your payment for the tickets for ${
                  planDetails?.title?.en
                } was not successful. 
                As a result, your booking has been canceled.
            </p>
            <h4 style="font-family: Arial, sans-serif; color: #333;">
                Tour Name: ${planDetails?.title?.en}
            </h4>
            <h4 style="font-family: Arial, sans-serif; color: #333;">
                Number Of Tickets: ${ticket?.adultQuantity + ticket?.childQuantity}
            </h4>
            <h4 style="font-family: Arial, sans-serif; color: #333;">
                Total Amount: ${ticket?.price} QAR
            </h4>
            <h4 style="font-family: Arial, sans-serif; color: #333;">
                Payment Status: Failed
            </h4>
            <h4 style="font-family: Arial, sans-serif; color: #333;">
                Transaction ID: ${ticket?.transactionId}
            </h4>
            <p style="font-family: Arial, sans-serif; color: #333;">
                If you have any questions or would like to retry your booking, please feel free to reach out to us.
            </p>
              <a 
    href="https://dohabus.com/invoice/${ticket?._id}" 
    style="color: #007bff; text-decoration: none; font-weight: bold;"
    target="_blank"
    rel="noopener noreferrer"
  >
   Customer Invoice
  </a>
            <br>
            ${esignature}
        `;

        // Send cancellation email to user
        await transporter.sendMail({
          to: ticket?.email,
          subject: `Cancellation of your ${planDetails?.title?.en} tickets`,
          html: cancellationEmailContent,
        });
      }
    } else {
      console.log("No booking found for transactionId:", transactionId);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.log("Webhook error", error);
    console.error("Error handling webhook:", error);
    res
      .status(500)
      .json({ success: false, message: "Internal server error", error: error.message });
  }
};
exports.getTickets = catchAsync(async (req, res, next) => {
  const userId = req.query.user != "undefined" ? req.query.user : null;

  // const tickets = await Ticket.find({ user: userId });
  const tickets = [];

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
      "firstName lastName email category plan price adultQuantity childQuantity date status pickupLocation dropLocation createdAt uniqueId paymentStatus",
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

  await Ticket.findByIdAndDelete(ticketId);
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

    // Loop through the sessions in the plan
    for (const session of plan.sessions) {
      sessionCounts[session._id] = 0; // Use _id as the key
      sessionStatus[session._id] = "Available"; // Default status
    }

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
    for (const session of plan.sessions) {
      if (sessionLimit > 0 && sessionCounts[session._id] >= sessionLimit) {
        sessionStatus[session._id] = "Full";
      } else if (sessionLimit > 0 && sessionCounts[session._id] >= sessionLimit / 2) {
        sessionStatus[session._id] = "Filling Up";
      }
    }

    console.log(sessionStatus, sessionCounts);

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

//Email hit-> (Payment+Booking)
