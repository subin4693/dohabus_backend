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
    if (!ticket.cybersourceConfirmationId) {
      return next(new AppError("Missing cybersourceConfirmationId", 400));
    }

    const transactionId = ticket.cybersourceConfirmationId;
    const host = "api.cybersource.com";
    const url = `${process.env.CYBERSOURCE_INQUIRY_URL}${transactionId}`;
    const merchantId = process.env.CYBERSOURCE_MERCHANT_ID;
    const apiKeyId = process.env.CYBERSOURCE_SHARED_API_KEY_ID;
    const sharedSecret = process.env.CYBERSOURCE_SHARED_API_SECRET;
    const date = new Date().toUTCString();

    // Compute digest of empty string for GET request
    const digest = crypto
      .createHash("sha256")
      .update("")
      .digest("base64");
    const digestHeader = `SHA-256=${digest}`;

    // Construct signature string with content-type included
    const signatureString = `(host): ${host}
(date): ${date}
(digest): ${digestHeader}
(content-type): application/json
(v-c-merchant-id): ${merchantId}`;

    const signedHeaders = "(host) (date) (digest) (content-type) (v-c-merchant-id)";

    const signature = crypto
      .createHmac("sha256", Buffer.from(sharedSecret, "base64"))
      .update(signatureString)
      .digest("base64");

    const authHeader = `Signature keyid="${apiKeyId}", algorithm="HmacSHA256", headers="${signedHeaders}", signature="${signature}"`;

    const headers = {
      host,
      date,
      digest: digestHeader,
      "v-c-merchant-id": merchantId,
      "Content-Type": "application/json", // ✅ Must be included for GET
      Accept: "application/json",
      Authorization: authHeader,
    };

    // Debug logs
    console.log("🔍 CyberSource Inquiry Debug Logs:");
    console.log("🧾 Transaction ID:", transactionId);
    console.log("🔗 URL:", url);
    console.log("📅 Date (UTC):", date);
    console.log("💨 Digest Header:", digestHeader);
    console.log("🧠 Signature String:\n", signatureString);
    console.log("🔐 Generated Signature:", signature);
    console.log("🔖 Authorization Header:\n", authHeader);
    console.log("📦 Final Headers Sent:", headers);

    try {
      const cybersourceResponse = await axios.get(url, { headers });

      const paymentData = cybersourceResponse.data;
      const status = paymentData.status;

      console.log("✅ CyberSource Response Received:", JSON.stringify(paymentData, null, 2));

      ticket.paymentStatus = ["AUTHORIZED", "PENDING", "SETTLED"].includes(status)
        ? "Paid"
        : "Failed";

      await ticket.save();

      return res.status(200).json({
        status: "success",
        message: `Payment status from CyberSource: ${status}`,
        updatedPaymentStatus: ticket.paymentStatus,
        data: paymentData,
      });
    } catch (err) {
      const errorData = err.response?.data;
      const errorStatus = err.response?.status;
      const errorHeaders = err.response?.headers;

      console.error("❌ CyberSource inquiry error occurred:");
      console.error("🧾 Status Code:", errorStatus);
      console.error("📨 Response Body:", JSON.stringify(errorData, null, 2));
      console.error("📄 Response Headers:", errorHeaders);

      return next(new AppError("Payment Method used is Cybersource", 500));
    }
  }

  // QPay Inquiry
  if (!ticket.pun) {
    const refundRecord = await Refund.findOne({ ticketId: ticket._id });

    ticket.paymentStatus = refundRecord ? "Paid" : "Cancelled";
    await ticket.save();

    return res.status(200).json({
      status: "success",
      message: refundRecord
        ? "Refund has been initiated for your ticket."
        : "No payment transaction found. Ticket updated to Cancelled.",
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

  inquiryData.SecureHash = generateInquirySecureHash(inquiryData, process.env.QPAY_SECRET_KEY);

  const inquiryResponseRaw = await sendInquiryRequest(inquiryData);
  const parsedInquiryResponse = require("querystring").parse(inquiryResponseRaw);

  const responseStatus = parsedInquiryResponse["Response.Status"];
  const originalStatus = parsedInquiryResponse["Response.OriginalStatus"];
  const originalStatusMessage = parsedInquiryResponse["Response.OriginalStatusMessage"];

  if (!responseStatus) {
    return next(new AppError("Invalid inquiry response: missing Response.Status", 500));
  }

  ticket.paymentStatus = originalStatus === "0000" ? "Paid" : "Failed";
  await ticket.save();

  return res.status(200).json({
    status: "success",
    message: originalStatusMessage,
    updatedPaymentStatus: ticket.paymentStatus,
    rawResponse: parsedInquiryResponse,
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
