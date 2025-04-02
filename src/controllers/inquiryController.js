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
    //     console.log(
    //       "inquirePayment: Processing CyberSource inquiry for ticket with uniqueId:",
    //       uniqueId,
    //     );
    //     try {
    //       // Extract the transaction ID from the ticket saved during payment processing
    //       const transactionId = ticket.transactionId;
    //       console.log("Transaction ID from ticket:", transactionId);
    //
    //       if (!transactionId) {
    //         return res.status(400).json({ error: "Transaction ID not found in ticket." });
    //       }
    //
    //       // Retrieve CyberSource credentials and endpoint from environment variables
    //       const {
    //         CYBERSOURCE_PROFILE_ID,
    //         CYBERSOURCE_ACCESS_KEY,
    //         CYBERSOURCE_SECRET_KEY,
    //         CYBERSOURCE_INQUIRY_URL, // if not provided, default to the production silent endpoint
    //       } = process.env;
    //
    //       // Use the inquiry URL if provided; otherwise, default to the production silent endpoint for hosted checkout.
    //       const inquiryUrl = CYBERSOURCE_INQUIRY_URL;
    //       console.log("Inquiry URL:", inquiryUrl);
    //
    //       // Generate a unique inquiry transaction UUID.
    //       // Append a suffix to distinguish inquiry requests from sale requests.
    //       const inquiryTransactionUuid = `${transactionId}-inquiry`;
    //       const signedDateTime = new Date().toISOString().split(".")[0] + "Z";
    //
    //       // Define the fields that will be signed.
    //       const signedFieldNames = [
    //         "access_key",
    //         "profile_id",
    //         "transaction_uuid",
    //         "signed_field_names",
    //         "signed_date_time",
    //         "transaction_type",
    //         "reference_number",
    //       ];
    //
    //       // Build the payload for the inquiry request.
    //       // Here, we assume that transaction_type "get_transaction" instructs CyberSource to return payment details.
    //       const fieldsToSign = {
    //         access_key: CYBERSOURCE_ACCESS_KEY,
    //         profile_id: CYBERSOURCE_PROFILE_ID,
    //         transaction_uuid: inquiryTransactionUuid,
    //         signed_field_names: signedFieldNames.join(","),
    //         signed_date_time: signedDateTime,
    //         transaction_type: "get_transaction",
    //         reference_number: transactionId,
    //       };
    //
    //       // Generate the signature using the inline sign() helper
    //       const signature = sign(fieldsToSign, CYBERSOURCE_SECRET_KEY);
    //       console.log("Generated signature:", signature);
    //
    //       // Assemble the complete payload (all fields plus the generated signature)
    //       const payload = {
    //         ...fieldsToSign,
    //         signature,
    //       };
    //
    //       console.log("DEBUG: CyberSource inquiry parameters:", payload);
    //
    //       // Send the POST request to CyberSource's inquiry endpoint.
    //       // The payload is sent as URL-encoded form data.
    //       // Corrected line (still using POST for now, address GET and Auth next)
    //       const response = await axios.post(`${inquiryUrl}/${transactionId}`, JSON.stringify(payload), {
    //         headers: {
    //           "Content-Type": "application/json",
    //           Accept: "application/json",
    //         },
    //       });
    //
    //       console.log("DEBUG: CyberSource inquiry response:", response.data);
    //
    //       // Parse the response.
    //       // Check the decision field to determine the payment status.
    //       const inquiryResult = response.data;
    //       let status = "unknown";
    //       if (inquiryResult.decision) {
    //         const decision = inquiryResult.decision.toLowerCase();
    //         if (decision === "accept") {
    //           status = "Paid";
    //         } else if (decision === "decline") {
    //           status = "Declined";
    //         } else {
    //           status = decision;
    //         }
    //       }
    //
    //       // Return the inquiry result to the caller
    //       return res.status(200).json({
    //         transactionId,
    //         status,
    //         details: inquiryResult,
    //       });
    //     } catch (error) {
    //       console.error("Error during CyberSource payment inquiry:", error.message);
    //       return next(new AppError(error.message, 500));
    //     }
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
  const originalConfirmationID = parsedInquiryResponse["Response.OriginalConfirmationID"];
  console.log(
    responseStatus,
    responseStatusMessage,
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
