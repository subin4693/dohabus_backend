// require("dotenv").config();
// const crypto = require("crypto");
// const axios = require("axios");
// const qs = require("qs");
//
// // Import your helper for catching async errors.
// const catchAsync = require("../utils/catchAsync");
// // Import your custom AppError class.
// const AppError = require("../utils/appError");
// // Import the Ticket model and refund.
// const Ticket = require("../models/ticketModel");
// const Refund = require("../models/refundModel");
//
// // Helper: Generates the secure hash for an inquiry request.
// // Fields order: SecretKey + Action + BankID + Lang + MerchantID + OriginalPUN
// const generateInquirySecureHash = (data, secretKey) => {
//   console.log("Generating inquiry secure hash...");
//   const fieldsOrder = ["Action", "BankID", "Lang", "MerchantID", "OriginalPUN"];
//   let hashString = secretKey;
//   fieldsOrder.forEach((field) => {
//     hashString += data[field] ? data[field].toString().trim() : "";
//   });
//   const hash = crypto
//     .createHash("sha256")
//     .update(hashString)
//     .digest("hex");
//   console.log("Inquiry Secure hash generated:", hash);
//   return hash;
// };
//
// // Helper: Sends an inquiry request to QPay via POST.
// const sendInquiryRequest = async (inquiryData) => {
//   const endpoint = process.env.QPAY_REDIRECT_URL;
//   console.log("Sending inquiry request to:", endpoint);
//   try {
//     const response = await axios.post(endpoint, qs.stringify(inquiryData), {
//       headers: { "Content-Type": "application/x-www-form-urlencoded" },
//     });
//     console.log("Inquiry response received:", response.data);
//     return response.data;
//   } catch (error) {
//     console.error("Inquiry request failed:", error.message);
//     throw new Error("Inquiry request failed: " + error.message);
//   }
// };
//
// exports.inquirePayment = catchAsync(async (req, res, next) => {
//   console.log("inquirePayment: Request body:", req.body);
//
//   const { uniqueId } = req.body;
//   if (!uniqueId) {
//     console.log("inquirePayment: Missing uniqueId");
//     return next(new AppError("uniqueId is required", 400));
//   }
//
//   console.log("inquirePayment: Looking up ticket with uniqueId:", uniqueId);
//   // Use findOne with uniqueId since it's a field in the Ticket model.
//   const ticket = await Ticket.findOne({ uniqueId: uniqueId });
//   if (!ticket) {
//     console.log("inquirePayment: Ticket not found for uniqueId:", uniqueId);
//     return res.status(200).json({
//       status: "success",
//       message: "Ticket not found. Payment status set to Cancelled.",
//       updatedPaymentStatus: "Cancelled",
//     });
//   }
//
//   // Check if the payment method is qpay
//   if (ticket.paymentMethod === "cybersource") {
//     console.log("inquirePayment: Payment method is not qpay for ticket with uniqueId:", uniqueId);
//     return next(new AppError("Payed using Credit Card. Please check Cybersource Portal", 400));
//   }
//
//   if (!ticket.pun) {
//     console.log("inquirePayment: No payment transaction found for ticket with uniqueId:", uniqueId);
//
//     // Check if the ticket has a refund record
//     const refundRecord = await Refund.findOne({ ticketId: ticket._id });
//     if (refundRecord) {
//       console.log("inquirePayment: Refund record found for ticket with uniqueId:", uniqueId);
//       ticket.paymentStatus = "Paid";
//       await ticket.save();
//       return res.status(200).json({
//         status: "success",
//         message: "Refund has been initiated for your ticket.",
//         updatedPaymentStatus: ticket.paymentStatus,
//       });
//     } else {
//       console.log("inquirePayment: No refund record found for ticket with uniqueId:", uniqueId);
//       ticket.paymentStatus = "Cancelled";
//       await ticket.save();
//       return res.status(200).json({
//         status: "success",
//         message: "No payment transaction found. Ticket updated to Cancelled.",
//         updatedPaymentStatus: ticket.paymentStatus,
//       });
//     }
//   }
//
//   const inquiryData = {
//     Action: "14",
//     BankID: process.env.QPAY_BANK_ID.trim(),
//     Lang: "en",
//     MerchantID: process.env.QPAY_MERCHANT_ID.trim(),
//     OriginalPUN: ticket.pun,
//   };
//
//   console.log("inquirePayment: Inquiry data before secure hash:", inquiryData);
//   inquiryData.SecureHash = generateInquirySecureHash(inquiryData, process.env.QPAY_SECRET_KEY);
//   console.log("inquirePayment: Inquiry data with secure hash:", inquiryData);
//
//   const inquiryResponseRaw = await sendInquiryRequest(inquiryData);
//   console.log("inquirePayment: Raw inquiry response:", inquiryResponseRaw);
//   const parsedInquiryResponse = require("querystring").parse(inquiryResponseRaw);
//   console.log("inquirePayment: Parsed inquiry response:", parsedInquiryResponse);
//
//   // Extract response fields based on QPay docs
//   const responseStatus = parsedInquiryResponse["Response.Status"];
//   const responseStatusMessage = parsedInquiryResponse["Response.StatusMessage"];
//   const originalStatus = parsedInquiryResponse["Response.OriginalStatus"];
//   const originalConfirmationID = parsedInquiryResponse["Response.OriginalConfirmationID"];
//   console.log(
//     responseStatus,
//     responseStatusMessage,
//     originalStatus,
//     originalConfirmationID,
//     "results from parsed request",
//   );
//
//   if (!responseStatus) {
//     return next(new AppError("Invalid inquiry response: missing Response.Status", 500));
//   }
//
//   // Update ticket payment status based on the inquiry response
//   if (responseStatus === "0000") {
//     ticket.paymentStatus = "Paid";
//   } else {
//     ticket.paymentStatus = "Failed";
//   }
//
//   // Save the updated ticket
//   await ticket.save();
//   console.log("inquirePayment: Ticket updated with paymentStatus:", ticket.paymentStatus);
//
//   return res.status(200).json({
//     status: "success",
//     message: responseStatusMessage,
//     updatedPaymentStatus: ticket.paymentStatus,
//   });
// });
//
// exports.inquireTicket = catchAsync(async (req, res, next) => {
//   console.log("inquireTicket: Request body:", req.body);
//
//   const { uniqueId } = req.body;
//   if (!uniqueId) {
//     console.log("inquireTicket: Missing uniqueId");
//     return next(new AppError("uniqueId is required", 400));
//   }
//
//   console.log("inquireTicket: Looking up ticket with uniqueId:", uniqueId);
//   const ticket = await Ticket.findOne({ uniqueId: uniqueId });
//   if (!ticket) {
//     console.log("inquireTicket: Ticket not found for uniqueId:", uniqueId);
//     return next(new AppError("Ticket not found", 404));
//   }
//
//   console.log("inquireTicket: Ticket found:", ticket);
//   return res.status(200).json({
//     status: "success",
//     ticket,
//   });
// });
require("dotenv").config();
const crypto = require("crypto");
const axios = require("axios");
const qs = require("qs");

// Import your helper for catching async errors.
const catchAsync = require("../utils/catchAsync");
// Import your custom AppError class.
const AppError = require("../utils/appError");
// Import the Ticket model and refund.
const Ticket = require("../models/ticketModel");
const Refund = require("../models/refundModel");

const sign = (data, secretKey) => {
  // data.signed_field_names is a comma-separated list of keys in the order to sign.
  const fieldNames = data.signed_field_names.split(",");
  // Build the string to sign as "key1=value1,key2=value2,..."
  const signData = fieldNames.map((field) => `${field}=${data[field]}`).join(",");
  const hmac = crypto.createHmac("sha256", secretKey);
  hmac.update(signData);
  return hmac.digest("base64");
};
// Helper: Generates the secure hash for an inquiry request.
// Fields order: SecretKey + Action + BankID + Lang + MerchantID + OriginalPUN
const generateInquirySecureHash = (data, secretKey) => {
  console.log("Generating inquiry secure hash...");
  const fieldsOrder = ["Action", "BankID", "Lang", "MerchantID", "OriginalPUN"];
  let hashString = secretKey;
  fieldsOrder.forEach((field) => {
    hashString += data[field] ? data[field].toString().trim() : "";
  });
  const hash = crypto
    .createHash("sha256")
    .update(hashString)
    .digest("hex");
  console.log("Inquiry Secure hash generated:", hash);
  return hash;
};

// Helper: Sends an inquiry request to QPay via POST.
const sendInquiryRequest = async (inquiryData) => {
  const endpoint = process.env.QPAY_REDIRECT_URL;
  console.log("Sending inquiry request to:", endpoint, "data", inquiryData);
  try {
    const response = await axios.post(endpoint, qs.stringify(inquiryData), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    console.log("Inquiry response received:", response.data);
    return response.data;
  } catch (error) {
    console.error("Inquiry request failed:", error.message);
    throw new Error("Inquiry request failed: " + error.message);
  }
};

exports.inquirePayment = catchAsync(async (req, res, next) => {
  console.log("inquirePayment: Request body:", req.body);

  const { uniqueId } = req.body;
  if (!uniqueId) {
    console.log("inquirePayment: Missing uniqueId");
    return next(new AppError("uniqueId is required", 400));
  }

  console.log("inquirePayment: Looking up ticket with uniqueId:", uniqueId);
  // Use findOne with uniqueId since it's a field in the Ticket model.
  const ticket = await Ticket.findOne({ uniqueId: uniqueId });
  if (!ticket) {
    console.log("inquirePayment: Ticket not found for uniqueId:", uniqueId);
    return res.status(200).json({
      status: "success",
      message: "Ticket not found. Payment status will be set to Cancelled if ticket exists.",
      updatedPaymentStatus: "Cancelled",
    });
  }

  // If the payment method is CyberSource, then build and send the inquiry request
  if (ticket.paymentMethod === "cybersource") {
    return next(new AppError("Payment Method used is cybersource", 400));
  }

  if (!ticket.pun) {
    console.log("inquirePayment: No payment transaction found for ticket with uniqueId:", uniqueId);

    // Check if the ticket has a refund record
    const refundRecord = await Refund.findOne({ ticketId: ticket._id });
    if (refundRecord) {
      console.log("inquirePayment: Refund record found for ticket with uniqueId:", uniqueId);
      ticket.paymentStatus = "Paid";
      await ticket.save();
      return res.status(200).json({
        status: "success",
        message: "Refund has been initiated for your ticket.",
        updatedPaymentStatus: ticket.paymentStatus,
      });
    } else {
      console.log("inquirePayment: No refund record found for ticket with uniqueId:", uniqueId);
      ticket.paymentStatus = "Cancelled";
      await ticket.save();
      return res.status(200).json({
        status: "success",
        message: "No payment transaction found. Ticket updated to Cancelled.",
        updatedPaymentStatus: ticket.paymentStatus,
      });
    }
  }

  // Process QPay inquiry if applicable.
  const inquiryData = {
    Action: "14",
    BankID: process.env.QPAY_BANK_ID.trim(),
    Lang: "en",
    MerchantID: process.env.QPAY_MERCHANT_ID.trim(),
    OriginalPUN: ticket.pun,
  };

  console.log("inquirePayment: Inquiry data before secure hash:", inquiryData);
  inquiryData.SecureHash = generateInquirySecureHash(inquiryData, process.env.QPAY_SECRET_KEY);
  console.log("inquirePayment: Inquiry data with secure hash:", inquiryData);

  const inquiryResponseRaw = await sendInquiryRequest(inquiryData);
  console.log("inquirePayment: Raw inquiry response:", inquiryResponseRaw);
  const parsedInquiryResponse = require("querystring").parse(inquiryResponseRaw);
  console.log("inquirePayment: Parsed inquiry response:", parsedInquiryResponse);

  // Extract response fields based on QPay docs
  const responseStatus = parsedInquiryResponse["Response.Status"];
  const responseStatusMessage = parsedInquiryResponse["Response.StatusMessage"];
  const originalStatus = parsedInquiryResponse["Response.OriginalStatus"];
  const originalStatusMessgae = parsedInquiryResponse["Response.OriginalStatusMessage"];
  const originalConfirmationID = parsedInquiryResponse["Response.OriginalConfirmationID"];
  console.log(
    responseStatus,
    responseStatusMessage,
    originalStatus,
    originalStatusMessgae,
    originalConfirmationID,
    "results from parsed request",
  );

  if (!responseStatus) {
    return next(new AppError("Invalid inquiry response: missing Response.Status", 500));
  }

  // Update ticket payment status based on the inquiry response
  if (originalStatus === "0000") {
    ticket.paymentStatus = "Paid";
  } else {
    ticket.paymentStatus = "Failed";
  }

  // Save the updated ticket
  await ticket.save();
  console.log("inquirePayment: Ticket updated with paymentStatus:", ticket.paymentStatus);

  return res.status(200).json({
    status: "success",
    message: originalStatusMessgae,
    updatedPaymentStatus: ticket.paymentStatus,
  });
});

exports.inquireTicket = catchAsync(async (req, res, next) => {
  console.log("inquireTicket: Request body:", req.body);

  const { uniqueId } = req.body;
  if (!uniqueId) {
    console.log("inquireTicket: Missing uniqueId");
    return next(new AppError("uniqueId is required", 400));
  }

  console.log("inquireTicket: Looking up ticket with uniqueId:", uniqueId);
  const ticket = await Ticket.findOne({ uniqueId: uniqueId });
  if (!ticket) {
    console.log("inquireTicket: Ticket not found for uniqueId:", uniqueId);
    return next(new AppError("Ticket not found", 404));
  }

  console.log("inquireTicket: Ticket found:", ticket);
  return res.status(200).json({
    status: "success",
    ticket,
  });
});

exports.searchTickets = catchAsync(async (req, res, next) => {
  const { filterBy, filterValue } = req.body;
  console.log("searchTickets: Request body:", req.body);

  if (!filterBy || !filterValue) {
    return next(new AppError("Both filterBy and filterValue are required", 400));
  }

  let query = {};
  switch (filterBy) {
    case "uniqueId":
      query.uniqueId = { $regex: filterValue, $options: "i" };
      break;
    case "email":
      query.email = { $regex: filterValue, $options: "i" };
      break;
    case "customer name":
      query = {
        $or: [
          { firstName: { $regex: filterValue, $options: "i" } },
          { lastName: { $regex: filterValue, $options: "i" } },
        ],
      };
      break;
    case "number":
      query.number = { $regex: filterValue, $options: "i" };
      break;
    case "price":
      // For price, we assume an exact numeric match. You could enhance this to support ranges.
      query.price = Number(filterValue);
      break;
    default:
      return next(new AppError("Invalid filter provided", 400));
  }

  const tickets = await Ticket.find(query);
  return res.status(200).json({
    status: "success",
    tickets,
  });
});
