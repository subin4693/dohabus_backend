require("dotenv").config();
const crypto = require("crypto");
const axios = require("axios");
const qs = require("qs");
const cybersourceRestApi = require("cybersource-rest-client");

// Import your helper for catching async errors.
const catchAsync = require("../utils/catchAsync");
// Import your custom AppError class.
const AppError = require("../utils/appError");
// Import the Ticket model and Refund.
const Ticket = require("../models/ticketModel");
const Refund = require("../models/refundModel");
const { log } = require("console");

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

  console.log("inquirePayment: Ticket found", ticket);

  if (ticket.refundPun) {
    console.log(
      "inquirePayment: Ticket has a refundPun. Payment status will be set to Refund Initaited.",
    );

    return res.status(200).json({
      status: "success",
      message: "Ticket has a refundPun. Payment status set to Refund Initiated.",
      updatedPaymentStatus: ticket.paymentStatus,
    });
  }
  console.log("Ticekt has no refundPun. Proceeding with payment inquiry.");

  if (ticket.paymentMethod === "cybersource") {
    console.log("💳 Payment method is CyberSource. Proceeding with inquiry.");

    // Inline configuration using environment variables
    const configObject = {
      authenticationType: process.env.CYBERSOURCE_AUTH_TYPE,
      runEnvironment: process.env.CYBERSOURCE_RUN_ENVIRONMENT,
      merchantID: process.env.CYBERSOURCE_MERCHANT_ID,
      merchantKeyId: process.env.CYBERSOURCE_SHARED_API_KEY_ID,
      merchantsecretKey: process.env.CYBERSOURCE_SHARED_API_SECRET,
      logConfiguration: {
        enableLog: true,
        logFileName: "cybs",
        logDirectory: "log",
        logFileMaxSize: "5242880",
        loggingLevel: "debug",
        enableMasking: false,
      },
    };

    // Initialize the API client and Transaction Details API
    const apiClient = new cybersourceRestApi.ApiClient();
    const transactionDetailsApi = new cybersourceRestApi.TransactionDetailsApi(
      configObject,
      apiClient,
    );

    // Use the CyberSource confirmation ID stored in the ticket as the payment ID
    const paymentId = ticket.cybersourceConfirmationId;
    if (!paymentId) {
      ticket.paymentStatus = "Cancelled";
      await ticket.save();
      console.error("❌ No CyberSource confirmation ID found in ticket.");
      return next(new AppError("Payment was not completed by client", 400));
    }
    console.log("💳 Payment ID to inquire:", paymentId);

    // Send the inquiry request to CyberSource
    transactionDetailsApi.getTransaction(paymentId, async function(error, data, response) {
      if (error) {
        console.error("❌ Payment inquiry error:", JSON.stringify(error, null, 2));
        return next(new AppError(`Payment inquiry failed: ${error.message || error}`, 500));
      }
      console.log("✅ Payment inquiry successful. Data:", JSON.stringify(data, null, 2));
      console.log("🔄 Payment inquiry Response:", JSON.stringify(response, null, 2));
      console.log("Response Code of Payment Inquiry:", response.status);

      // Update the Ticket with the new payment status based on the decision from riskInformation
      try {
        let decision = null;
        if (
          data &&
          data.riskInformation &&
          data.riskInformation.profile &&
          data.riskInformation.profile.decision
        ) {
          decision = data.riskInformation.profile.decision;
          console.log("✅ Risk decision from inquiry:", decision);
        }
        // If decision is ACCEPT, mark as "Paid"; otherwise, mark as "Failed"
        if (decision && decision.toUpperCase() === "ACCEPT") {
          ticket.paymentStatus = "Paid";
        } else {
          ticket.paymentStatus = "Failed";
        }
        await ticket.save();
        console.log("✅ Ticket updated with payment status:", ticket.paymentStatus);
      } catch (dbError) {
        console.error("❌ Error updating ticket payment status in DB:", dbError);
        return next(new AppError("Payment inquiry succeeded but failed to update DB", 500));
      }

      // Send response to the front end with the updated payment status and inquiry data
      return res.status(200).json({
        status: "success",
        message: "Payment inquiry completed",
        updatedPaymentStatus: ticket.paymentStatus,
        data: data,
      });
    });
  } else {
    console.log("💳 Payment method is QPay. Proceeding with inquiry.");
    if (!ticket.pun) {
      console.log("inquirePayment: Ticket has no PUN. Payment status will be set to Cancelled.");

      ticket.paymentStatus = "Cancelled";
      await ticket.save();
      return res.status(200).json({
        status: "success",
        message: "Transaction was not completed by User",
        updatedPaymentStatus: ticket.paymentStatus,
      });
    }

    // QPay Inquiry
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
  }
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

exports.inquireRefund = async (req, res, next) => {
  try {
    // Get the uniqueId from the request body
    const { uniqueId } = req.body;
    console.log("uniqueId", uniqueId);

    // Find the ticket in the database
    const ticket = await Ticket.findOne({ uniqueId });
    if (!ticket) {
      return next(new AppError("Ticket not found. Please check the unique ID.", 404));
    }

    // Ensure the refund reference exists on the ticket (stored as refundPun)
    const refundId = ticket.refundPun;
    if (!refundId) {
      return next(new AppError("No refund reference found for this ticket.", 400));
    }

    // Process only CyberSource payments here
    console.log("Ticket payment method:", ticket.paymentMethod);

    if (ticket.paymentMethod === "cybersource") {
      console.log("💳 Payment method is CyberSource. Proceeding with refund inquiry.");

      // Inline configuration using environment variables
      const configObject = {
        authenticationType: process.env.CYBERSOURCE_AUTH_TYPE,
        runEnvironment: process.env.CYBERSOURCE_RUN_ENVIRONMENT,
        merchantID: process.env.CYBERSOURCE_MERCHANT_ID,
        merchantKeyId: process.env.CYBERSOURCE_SHARED_API_KEY_ID,
        merchantsecretKey: process.env.CYBERSOURCE_SHARED_API_SECRET,
        logConfiguration: {
          enableLog: true,
          logFileName: "cybs",
          logDirectory: "log",
          logFileMaxSize: "5242880",
          loggingLevel: "debug",
          enableMasking: false,
        },
      };

      // Initialize the API client and Transaction Details API
      const apiClient = new cybersourceRestApi.ApiClient();
      const transactionDetailsApi = new cybersourceRestApi.TransactionDetailsApi(
        configObject,
        apiClient,
      );

      // Send the inquiry request to CyberSource using the refund reference (refundId)
      transactionDetailsApi.getTransaction(refundId, async function(error, data, response) {
        if (error) {
          console.error("❌ Refund inquiry error:", JSON.stringify(error, null, 2));
          let errorMessage = "Refund inquiry failed due to an unexpected error.";
          if (error.message) {
            errorMessage = `Refund inquiry error: ${error.message}`;
          }
          return next(new AppError(errorMessage, 500));
        }

        // Log the returned status from CyberSource
        console.log(
          "✅ Refund inquiry successful: Status of Refund:",
          data.applicationInformation.status,
        );
        const responseCode = data.applicationInformation.status;

        // Update database based on the response status
        if (responseCode === "TRANSMITTED") {
          // Update ticket: set paymentStatus to "Refunded"
          ticket.paymentStatus = "Refunded";
          await ticket.save();
          // Update refund record: set status to "Refunded"
          let refundRecord = await Refund.findOne({ ticketId: ticket._id });

          refundRecord.status = "Refunded";
          await refundRecord.save();
        } else if (responseCode === "PENDING") {
          // Update ticket: set paymentStatus to "Refund Pending"
          ticket.paymentStatus = "Refund Pending";
          await ticket.save();
          // No refund update logic for PENDING status
        } else {
          // For all other cases, treat as rejected.
          ticket.paymentStatus = "Refund Rejected By Portal";
          await ticket.save();
          let refundRecord = await Refund.findOne({ ticketId: ticket._id });

          refundRecord.status = "Rejected";
          await refundRecord.save();
        }

        // Prepare a friendlier response for the frontend
        const refundResponse = {
          refundId: data.id,
          status: data.applicationInformation?.status || "Unknown",
          reconciliationId: data.reconciliationId,
          submitTimeUTC: data.submitTimeUTC,
          approvalCode: data.processorInformation?.approvalCode || null,
          errorMessage: data.errorInformation?.message || null,
          fullResponse: data,
        };

        return res.status(200).json({
          status: "success",
          message: "Refund inquiry completed successfully.",
          data: refundResponse,
        });
      });
    } // QPay Refund Inquiry
    else {
      console.log("💳 Payment method is QPay. Proceeding with refund inquiry.");

      try {
        // Build the inquiry data for QPay using refundPun instead of pun
        const inquiryData = {
          Action: "14",
          BankID: process.env.QPAY_BANK_ID.trim(),
          Lang: "en",
          MerchantID: process.env.QPAY_MERCHANT_ID.trim(),
          OriginalPUN: ticket.refundPun, // use refundPun here
        };

        // Generate secure hash for inquiry
        inquiryData.SecureHash = generateInquirySecureHash(
          inquiryData,
          process.env.QPAY_SECRET_KEY,
        );

        // Send the inquiry request (assumes sendInquiryRequest is an async function that returns raw response)
        const inquiryResponseRaw = await sendInquiryRequest(inquiryData);
        const parsedInquiryResponse = require("querystring").parse(inquiryResponseRaw);
        console.log("Parsed inquiry response:", parsedInquiryResponse);

        // Extract expected values from the parsed response
        const responseStatus = parsedInquiryResponse["Response.Status"];
        const originalStatus = parsedInquiryResponse["Response.OriginalStatus"];
        const originalStatusMessage = parsedInquiryResponse["Response.OriginalStatusMessage"];

        if (!responseStatus) {
          throw new Error("Invalid refund inquiry response: missing Response.Status");
        }

        // Log the QPay refund inquiry result
        console.log("QPay Refund Inquiry Result:", parsedInquiryResponse);

        return res.status(200).json({
          status: "success",
          paymentMethod: "QPay",
          message: originalStatusMessage,
          originalStatus: originalStatus,
        });
      } catch (error) {
        console.error("Refund inquiry error (QPay):", error);
        return res.status(500).json({
          status: "error",
          paymentMethod: "QPay",
          message: "Failed to get refund inquiry for QPay.",
          error: error.message,
        });
      }
    }
  } catch (err) {
    console.error("❌ Inquire Refund encountered an error:", err);
    return next(new AppError("Internal Server Error while processing refund inquiry.", 500));
  }
};
