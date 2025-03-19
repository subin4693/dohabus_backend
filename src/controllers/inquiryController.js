// require("dotenv").config();
// const crypto = require("crypto");
// const axios = require("axios");
// const qs = require("qs");
//
// // Import your helper for catching async errors.
// const catchAsync = require("../utils/catchAsync");
// // Import your custom AppError class.
// const AppError = require("../utils/appError");
// // Import the Ticket model.
// const Ticket = require("../models/ticketModel");
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
//     return next(new AppError("Ticket not found", 404));
//   }
//
//   if (!ticket.pun) {
//     console.log("inquirePayment: No payment transaction found for ticket with uniqueId:", uniqueId);
//     return next(
//       new AppError(
//         "No payment transaction found for this ticket. Please create a payment transaction first or wait for an update.",
//         400,
//       ),
//     );
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
//   // --- Error handling per QPay docs ---
//   // Extract the response status and status message from the parsed response
//   const responseStatus = parsedInquiryResponse["Response.Status"];
//   const responseStatusMessage = parsedInquiryResponse["Response.StatusMessage"];
//   console.log(responseStatusMessage);
//
//   if (!responseStatus) {
//     return next(new AppError("Invalid inquiry response: missing Response.Status", 500));
//   }
//   if (responseStatus !== "0000") {
//     return next(new AppError(responseStatusMessage, 400));
//   }
//   // --------------------------------------------------
//
//   return res.status(200).json({
//     status: "success",
//     message: responseStatusMessage,
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
// Import the Ticket model.
const Ticket = require("../models/ticketModel");

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
  console.log("Sending inquiry request to:", endpoint);
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
      message: "Ticket not found. Payment status set to Cancelled.",
      updatedPaymentStatus: "Cancelled",
    });
  }

  if (!ticket.pun) {
    console.log("inquirePayment: No payment transaction found for ticket with uniqueId:", uniqueId);
    ticket.paymentStatus = "Cancelled";
    await ticket.save();
    return res.status(200).json({
      status: "success",
      message: "No payment transaction found. Ticket updated to Cancelled.",
      updatedPaymentStatus: ticket.paymentStatus,
    });
  }

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
  const originalConfirmationID = parsedInquiryResponse["Response.OriginalConfirmationID"];
  console.log(
    responseStatus,
    responseStatus,
    originalStatus,
    originalConfirmationID,
    "results from parsed request",
  );

  if (!responseStatus) {
    return next(new AppError("Invalid inquiry response: missing Response.Status", 500));
  }

  // Update ticket payment status based on the inquiry response
  if (responseStatus === "0000") {
    ticket.paymentStatus = "Paid";
  } else {
    ticket.paymentStatus = "Failed";
  }

  // Save the updated ticket
  await ticket.save();
  console.log("inquirePayment: Ticket updated with paymentStatus:", ticket.paymentStatus);

  return res.status(200).json({
    status: "success",
    message: responseStatusMessage,
    updatedPaymentStatus: ticket.paymentStatus,
  });
});
