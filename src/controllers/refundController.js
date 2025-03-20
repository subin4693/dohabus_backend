// const nodemailer = require("nodemailer");
// const crypto = require("crypto");
// const axios = require("axios");
// const dotenv = require("dotenv");
// const qs = require("querystring");
// const AppError = require("../utils/appError");
// const catchAsync = require("../utils/catchAsync");
// const Ticket = require("../models/ticketModel");
// const Refund = require("../models/refundModel");
//
// dotenv.config();
//
// /**
//  * Generates the secure hash for a refund request for QPay.
//  * Fields order: SecretKey + Action + Amount_1 + BankID + CurrencyCode + Lang + MerchantID + OriginalTransactionPaymentUniqueNumber_1 + PUN_1 + TransactionRequestDate
//  */
// const generateRefundSecureHash = (data, secretKey) => {
//   console.log("Generating refund secure hash...");
//   const fieldsOrder = [
//     "Action",
//     "Amount_1",
//     "BankID",
//     "CurrencyCode",
//     "Lang",
//     "MerchantID",
//     "OriginalTransactionPaymentUniqueNumber_1",
//     "PUN_1",
//     "TransactionRequestDate",
//   ];
//   let hashString = secretKey;
//   fieldsOrder.forEach((field) => {
//     hashString += data[field] ? data[field].toString().trim() : "";
//   });
//   const hash = crypto
//     .createHash("sha256")
//     .update(hashString)
//     .digest("hex");
//   console.log("Secure hash generated:", hash);
//   return hash;
// };
//
// /**
//  * Generates the transaction request date in ddMMyyyyHHmmss format.
//  */
// const generateTransactionRequestDate = () => {
//   console.log("Generating transaction request date...");
//   const now = new Date();
//   const pad = (n) => (n < 10 ? "0" + n : n);
//   const dateString =
//     pad(now.getDate()) +
//     pad(now.getMonth() + 1) +
//     now.getFullYear() +
//     pad(now.getHours()) +
//     pad(now.getMinutes()) +
//     pad(now.getSeconds());
//   console.log("Transaction request date generated:", dateString);
//   return dateString;
// };
//
// /**
//  * Generates a unique Payment Unique Number (PUN) for the QPay refund.
//  */
// const generateRefundPUN = () => {
//   console.log("Generating refund PUN...");
//   const refundPUN = crypto
//     .randomBytes(10)
//     .toString("hex")
//     .substring(0, 20)
//     .toUpperCase();
//   console.log("Refund PUN generated:", refundPUN);
//   return refundPUN;
// };
//
// /**
//  * Helper function to generate HMAC-SHA256 signature (used by CyberSource refunds).
//  * It concatenates the signed fields in order.
//  */
// function sign(payload, secretKey) {
//   const signedNames = payload.signed_field_names.split(",");
//   const dataToSign = signedNames.map((name) => `${name}=${payload[name]}`).join(",");
//   return crypto
//     .createHmac("sha256", secretKey)
//     .update(dataToSign)
//     .digest("base64");
// }
//
// /**
//  * Sends the refund request to QPay via a POST call.
//  */
// const sendRefundRequest = async (refundData) => {
//   const endpoint = process.env.QPAY_REDIRECT_URL;
//   console.log("Sending refund request to QPay endpoint:", endpoint);
//   console.log("Refund request data:", refundData);
//   try {
//     const response = await axios.post(endpoint, qs.stringify(refundData), {
//       headers: {
//         "Content-Type": "application/x-www-form-urlencoded",
//       },
//     });
//     console.log("Refund response received from QPay:", response.data);
//     return response.data;
//   } catch (error) {
//     console.error("Refund request failed:", error.message);
//     throw new Error("Refund request failed: " + error.message);
//   }
// };
//
// /**
//  * processRefund:
//  * - Expects req.body to contain { refundAmount, ticketId }
//  * - Looks up the original ticket, builds and signs the refund request,
//  *   sends the request to QPay or CyberSource based on the payment method,
//  *   updates the ticket and refund record, and returns the response.
//  */
// exports.processRefund = catchAsync(async (req, res, next) => {
//   const { refundAmount, ticketId } = req.body;
//   if (!ticketId || !refundAmount) {
//     return next(new AppError("ticketId and refundAmount are required", 400));
//   }
//
//   const ticket = await Ticket.findById(ticketId);
//   console.log("Ticket Pulled", ticket);
//
//   if (!ticket) {
//     return next(new AppError("Ticket not found", 404));
//   }
//
//   if (ticket.paymentStatus !== "Paid") {
//     return next(new AppError("Only paid tickets can be refunded", 400));
//   }
//
//   // CyberSource refund processing
//   if (ticket.paymentMethod === "cybersource") {
//     console.log("Processing CyberSource refund...");
//     const refundTransactionUuid = ticket.transactionId + "-refund";
//     const signedDateTime = new Date().toISOString().split(".")[0] + "Z";
//     const signedFieldNamesArray = [
//       "access_key",
//       "profile_id",
//       "transaction_uuid",
//       "signed_field_names",
//       "signed_date_time",
//       "transaction_type",
//       "reference_number",
//       "amount",
//       "currency",
//       "locale",
//     ];
//
//     const payload = {
//       access_key: process.env.CYBERSOURCE_ACCESS_KEY,
//       profile_id: process.env.CYBERSOURCE_PROFILE_ID,
//       transaction_uuid: refundTransactionUuid,
//       signed_field_names: signedFieldNamesArray.join(","),
//       signed_date_time: signedDateTime,
//       transaction_type: "refund", // Use "refund" (or "credit") per your configuration
//       reference_number: ticket.transactionId,
//       amount: refundAmount.toString(),
//       currency: ticket.currency, // e.g., "USD"
//       locale: "en-us",
//     };
//
//     const signature = sign(payload, process.env.CYBERSOURCE_SECRET_KEY);
//     const refundRequestPayload = { ...payload, signature };
//
//     const productionEndpoint = "https://secureacceptance.cybersource.com/silent/pay";
//     console.log("Sending CyberSource refund request to:", productionEndpoint);
//     console.log("CyberSource refund request payload:", refundRequestPayload);
//     const response = await axios.post(productionEndpoint, refundRequestPayload);
//     console.log("CyberSource refund response received:", response.data);
//
//     if (response.data.decision === "ACCEPT") {
//       ticket.paymentStatus = "Refund Processing";
//       ticket.refundTransactionId = response.data.transaction_id;
//       await ticket.save();
//
//       const refundRecord = await Refund.findOne({ ticketId: ticket._id });
//       if (refundRecord) {
//         refundRecord.status = "Processing";
//         refundRecord.refundAmount = refundAmount;
//         await refundRecord.save();
//       }
//
//       return res.status(200).json({
//         status: "success",
//         message: "Refund request initiated via CyberSource",
//         data: { refundRequest: refundRequestPayload, refundResponse: response.data },
//       });
//     } else {
//       // Enhanced error handling based on CyberSource reason codes
//       let errorMsg = "";
//       switch (response.data.reason_code) {
//         case "101":
//           errorMsg = "Invalid refund amount.";
//           break;
//         case "102":
//           errorMsg = "Refund not allowed for this transaction.";
//           break;
//         case "150":
//           errorMsg = "Original transaction has not been settled yet.";
//           break;
//         case "200":
//           errorMsg = "Refund already processed.";
//           break;
//         case "300":
//           errorMsg = "Authentication error during refund processing.";
//           break;
//         default:
//           errorMsg = response.data.message || "Refund failed due to an unknown error.";
//       }
//       return next(new AppError(`Refund failed: ${errorMsg}`, 400));
//     }
//   } else {
//     // QPay refund processing
//     console.log("Processing QPay refund...");
//     const formattedRefundAmount = Math.round(parseFloat(refundAmount) * 100).toString();
//     const refundPUN = generateRefundPUN();
//     const transactionRequestDate = generateTransactionRequestDate();
//
//     const refundData = {
//       Action: "6",
//       Amount_1: formattedRefundAmount,
//       BankID: process.env.QPAY_BANK_ID.trim(),
//       CurrencyCode: "634",
//       Lang: "en",
//       MerchantID: process.env.QPAY_MERCHANT_ID.trim(),
//       OriginalTransactionPaymentUniqueNumber_1: ticket.pun,
//       PUN_1: refundPUN,
//       TransactionRequestDate: transactionRequestDate,
//     };
//
//     refundData.SecureHash = generateRefundSecureHash(refundData, process.env.QPAY_SECRET_KEY);
//
//     const refundResponseRaw = await sendRefundRequest(refundData);
//     const parsedResponse = require("querystring").parse(refundResponseRaw);
//
//     const statusCode = parsedResponse["Response.Status_1"] || parsedResponse["Response.Status"];
//
//     if (statusCode !== "5002") {
//       let errorMsg;
//       switch (statusCode) {
//         case "5003":
//           errorMsg = "A request has already been made. Please contact Bank to know the status";
//           break;
//         case "5004":
//           errorMsg = "Original transaction not found for refund.";
//           break;
//         case "5006":
//           errorMsg = "The provided currency does not match the original transaction's currency.";
//           break;
//         case "5007":
//           errorMsg = "Abnormal error occurred while performing refund.";
//           break;
//         case "5008":
//           errorMsg = "The refund amount cannot be higher than booking amount.";
//           break;
//         case "5011":
//           errorMsg = "Refund rejected: transaction has a pending chargeback.";
//           break;
//         case "5012":
//           errorMsg = "Refund rejected: transaction has already been charged back.";
//           break;
//         case "5013":
//           errorMsg = "Original transaction for refund requires reversal.";
//           break;
//         case "5015":
//           errorMsg = "The transaction is already refunded.";
//           break;
//         case "5018":
//           errorMsg = "The original transaction is not a Pay transaction.";
//           break;
//         case "5019":
//           errorMsg = "Payment validation failed.";
//           break;
//         case "8107":
//           errorMsg = "Refund amount must be greater than 0.";
//           break;
//         case "8108":
//           errorMsg = "Transaction currency not supported.";
//           break;
//         case "8200":
//           errorMsg = "Current action is not supported for this merchant.";
//           break;
//         case "8201":
//           errorMsg = "Current IP is not valid for this merchant.";
//           break;
//         case "8300":
//           errorMsg = "Backend is inactive, refund cannot be performed.";
//           break;
//         case "9001":
//           errorMsg = "Unknown backend error, please try again.";
//           break;
//         default:
//           errorMsg = parsedResponse["Response.StatusMessage_1"] || "Unknown refund error.";
//       }
//       return next(new AppError(`Refund failed: ${errorMsg}`, 400));
//     }
//
//     ticket.paymentStatus = "Refund Processing";
//     ticket.refundPun = refundPUN;
//     await ticket.save();
//
//     const updatedTicket = await Ticket.findById(ticket._id);
//     console.log("Updated Ticket Data:", updatedTicket);
//
//     const refundRecord = await Refund.findOne({ ticketId: ticket._id });
//     if (refundRecord) {
//       refundRecord.status = "Processing";
//       refundRecord.refundAmount = refundAmount;
//       await refundRecord.save();
//     }
//
//     return res.status(200).json({
//       status: "success",
//       message: "Refund request initiated via QPay",
//       data: { refundRequest: refundData, refundResponse: parsedResponse },
//     });
//   }
// });
//
// /**
//  * requestRefund:
//  * - Expects req.body to contain { uniqueId, reason }
//  * - Creates a refund record in the Refund collection,
//  *   sends an email notification to the admin, and returns a success message.
//  */
// exports.requestRefund = async (req, res) => {
//   try {
//     const { uniqueId, reason } = req.body;
//     console.log("Debug:", uniqueId, reason);
//
//     if (!uniqueId || !reason) {
//       return res.status(400).json({ error: "uniqueId and reason are required." });
//     }
//
//     const ticket = await Ticket.findOne({ uniqueId: uniqueId });
//     if (!ticket) {
//       return res
//         .status(404)
//         .json({ error: "Ticket not found!. Please Check the Booking ID again" });
//     }
//
//     // Check if a refund request already exists for this ticket with status Pending or Processing
//     const existingRefund = await Refund.findOne({
//       ticketId: ticket._id,
//       status: { $in: ["Pending", "Processing"] },
//     });
//     if (existingRefund) {
//       return res.status(400).json({
//         error: "A refund request for this ticket already exists.",
//       });
//     }
//
//     // Create new Refund record using the ticket's ObjectId
//     const refund = new Refund({
//       ticketId: ticket._id,
//       reason,
//       paymentMethod: ticket.paymentMethod,
//       status: "Pending",
//     });
//     await refund.save();
//     console.log("Refund record created successfully.");
//
//     // (Optional) Send email notification to admin about the new refund request
//     const transporter = nodemailer.createTransport({
//       service: "gmail",
//       auth: {
//         user: process.env.EMAIL,
//         pass: process.env.EMAIL_PASSWORD,
//       },
//     });
//
//     const mailOptions = {
//       from: process.env.EMAIL,
//       // to: "melvinmps11301@gmail.com",
//       to: process.env.EMAIL,
//       subject: "New Refund Request",
//       text: `The booking with unique ID ${uniqueId} (Ticket ID: ${ticket._id}) has requested a refund. Reason: ${reason}`,
//     };
//
//     await transporter.sendMail(mailOptions);
//     console.log("Admin notification email sent successfully.");
//
//     return res.status(200).json({
//       message: "Refund request submitted successfully!",
//       refundId: refund._id,
//     });
//   } catch (error) {
//     console.error("Error in requestRefund:", error);
//     return res.status(500).json({ error: error.message });
//   }
// };
//
// /**
//  * getRefundRequests:
//  * - Fetches all refund records from the Refund collection.
//  * - Populates related ticket details.
//  * - Returns the refund data for the admin panel.
//  */
// exports.getRefundRequests = catchAsync(async (req, res, next) => {
//   console.log("Fetching all refund requests for admin panel...");
//
//   // Only select refunds where ticketId is not null
//   const refunds = await Refund.find({ ticketId: { $ne: null } })
//     .populate("ticketId")
//     .populate("ticketId", "uniqueId firstName lastName email paymentStatus");
//
//   console.log(refunds);
//
//   return res.status(200).json({
//     status: "success",
//     data: {
//       refunds,
//     },
//   });
// });
//
// /**
//  * rejectRefundRequest:
//  * - Expects req.body to contain { ticketId }.
//  * - Looks up the ticket and the corresponding refund record.
//  * - Updates the ticket's paymentStatus to "Refund Rejected By DohaBus"
//  *   and sets the refund record's status to "Rejected".
//  * - Returns a success message along with the updated documents.
//  */
// exports.rejectRefundRequest = catchAsync(async (req, res, next) => {
//   const { ticketId } = req.body;
//   if (!ticketId) {
//     return next(new AppError("ticketId is required", 400));
//   }
//
//   // Find the ticket by its ObjectId
//   const ticket = await Ticket.findById(ticketId);
//   if (!ticket) {
//     return next(new AppError("Ticket not found", 404));
//   }
//
//   // Update the ticket's paymentStatus to indicate the refund was rejected by DohaBus
//   ticket.paymentStatus = "Refund Rejected By DohaBus";
//   await ticket.save();
//
//   // Find and update the corresponding refund record (if one exists)
//   const refundRecord = await Refund.findOne({ ticketId: ticket._id });
//   if (refundRecord) {
//     refundRecord.status = "Rejected";
//     await refundRecord.save();
//   }
//
//   console.log("Ticket and refund record updated for refund rejection.");
//
//   return res.status(200).json({
//     status: "success",
//     message: "Refund request rejected by DohaBus and database updated.",
//     data: {
//       ticket,
//       refundRecord: refundRecord || null,
//     },
//   });
// });

const nodemailer = require("nodemailer");
const crypto = require("crypto");
const axios = require("axios");
const dotenv = require("dotenv");
const qs = require("querystring");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const Ticket = require("../models/ticketModel");
const Refund = require("../models/refundModel");

dotenv.config();

/**
 * Generates the secure hash for a refund request for QPay.
 * Fields order: SecretKey + Action + Amount_1 + BankID + CurrencyCode + Lang + MerchantID +
 * OriginalTransactionPaymentUniqueNumber_1 + PUN_1 + TransactionRequestDate
 */
const generateRefundSecureHash = (data, secretKey) => {
  console.log("Generating refund secure hash...");
  const fieldsOrder = [
    "Action",
    "Amount_1",
    "BankID",
    "CurrencyCode",
    "Lang",
    "MerchantID",
    "OriginalTransactionPaymentUniqueNumber_1",
    "PUN_1",
    "TransactionRequestDate",
  ];
  let hashString = secretKey;
  fieldsOrder.forEach((field) => {
    hashString += data[field] ? data[field].toString().trim() : "";
  });
  const hash = crypto
    .createHash("sha256")
    .update(hashString)
    .digest("hex");
  console.log("Secure hash generated:", hash);
  return hash;
};

/**
 * Generates the transaction request date in ddMMyyyyHHmmss format.
 */
const generateTransactionRequestDate = () => {
  console.log("Generating transaction request date...");
  const now = new Date();
  const pad = (n) => (n < 10 ? "0" + n : n);
  const dateString =
    pad(now.getDate()) +
    pad(now.getMonth() + 1) +
    now.getFullYear() +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds());
  console.log("Transaction request date generated:", dateString);
  return dateString;
};

/**
 * Generates a unique Payment Unique Number (PUN) for the QPay refund.
 */
const generateRefundPUN = () => {
  console.log("Generating refund PUN...");
  const refundPUN = crypto
    .randomBytes(10)
    .toString("hex")
    .substring(0, 20)
    .toUpperCase();
  console.log("Refund PUN generated:", refundPUN);
  return refundPUN;
};

/**
 * Helper function to generate HMAC-SHA256 signature (used by CyberSource refunds).
 * It concatenates the signed fields in order.
 */
function sign(payload, secretKey) {
  const signedNames = payload.signed_field_names.split(",");
  const dataToSign = signedNames.map((name) => `${name}=${payload[name]}`).join(",");
  return crypto
    .createHmac("sha256", secretKey)
    .update(dataToSign)
    .digest("base64");
}

/**
 * Sends the refund request to QPay via a POST call.
 */
const sendRefundRequest = async (refundData) => {
  const endpoint = process.env.QPAY_REDIRECT_URL;
  console.log("Sending refund request to QPay endpoint:", endpoint);
  console.log("Refund request data:", refundData);
  try {
    const response = await axios.post(endpoint, qs.stringify(refundData), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    console.log("Refund response received from QPay:", response.data);
    return response.data;
  } catch (error) {
    console.error("Refund request failed:", error.message);
    throw new Error("Refund request failed: " + error.message);
  }
};

/**
 * processRefund:
 * - Expects req.body to contain { refundAmount, ticketId }
 * - Looks up the original ticket, builds and signs the refund request,
 *   sends the request to QPay or CyberSource based on the payment method,
 *   updates the ticket and refund record, and returns the response.
 */
exports.processRefund = catchAsync(async (req, res, next) => {
  const { refundAmount, ticketId } = req.body;
  if (!ticketId || !refundAmount) {
    return next(new AppError("ticketId and refundAmount are required", 400));
  }

  const ticket = await Ticket.findById(ticketId);
  console.log("Ticket Pulled", ticket);

  if (!ticket) {
    return next(new AppError("Ticket not found", 404));
  }

  if (ticket.paymentStatus !== "Paid") {
    return next(new AppError("Only paid tickets can be refunded", 400));
  }

  // CyberSource refund processing using the REST API
  if (ticket.paymentMethod === "cybersource") {
    console.log("Processing CyberSource refund...");
    // Build the REST API endpoint using the original transaction ID
    // Production endpoint: https://api.cybersource.com/pts/v2/payments/{id}/refunds
    // For testing, use: https://apitest.cybersource.com/pts/v2/payments/{id}/refunds
    const refundEndpoint = `https://api.cybersource.com/pts/v2/payments/${ticket.cybersourceOrderId}/refunds`;

    // Build payload per the REST API structure
    const refundPayload = {
      orderInformation: {
        amountDetails: {
          totalAmount: Number(refundAmount).toFixed(2), // ensures "100.00" format
          currency: "634", // use the exact three-letter code used originally (or "QAR" if appropriate)
        },
      },
    };

    console.log("Sending CyberSource refund request to:", refundEndpoint);
    console.log("CyberSource refund request payload:", refundPayload);

    try {
      const response = await axios.post(refundEndpoint, refundPayload, {
        headers: {
          "Content-Type": "application/json",
          "v-c-merchant-id": process.env.QPAY_MERCHANT_ID,
          // Include additional authentication headers if required.
        },
      });
      console.log("CyberSource refund response received:", response.data);

      if (
        response.data.status === "PENDING" ||
        (response.data.processorInformation &&
          response.data.processorInformation.responseCode === "100")
      ) {
        ticket.paymentStatus = "Refund Processing";
        ticket.refundTransactionId = response.data.id;
        await ticket.save();

        const refundRecord = await Refund.findOne({ ticketId: ticket._id });
        if (refundRecord) {
          refundRecord.status = "Processing";
          refundRecord.refundAmount = refundAmount;
          await refundRecord.save();
        }

        return res.status(200).json({
          status: "success",
          message: "Refund request initiated via CyberSource REST API",
          data: { refundResponse: response.data },
        });
      } else {
        let errorMsg = "";
        if (response.data.processorInformation) {
          switch (response.data.processorInformation.responseCode) {
            case "101":
              errorMsg = "Invalid refund amount.";
              break;
            case "102":
              errorMsg = "Refund not allowed for this transaction.";
              break;
            case "150":
              errorMsg = "Original transaction has not been settled yet.";
              break;
            case "200":
              errorMsg = "Refund already processed.";
              break;
            case "300":
              errorMsg = "Authentication error during refund processing.";
              break;
            default:
              errorMsg = response.data.message || "Refund failed due to an unknown error.";
          }
        } else {
          errorMsg = response.data.message || "Refund failed due to an unknown error.";
        }
        return next(new AppError(`Refund failed: ${errorMsg}`, 400));
      }
    } catch (error) {
      console.log(error);

      console.error("CyberSource refund request error:", error.message);
      return next(new AppError("CyberSource refund request error: " + error.message, 500));
    }
  } else {
    // QPay refund processing
    console.log("Processing QPay refund...");
    const formattedRefundAmount = Math.round(parseFloat(refundAmount) * 100).toString();
    const refundPUN = generateRefundPUN();
    const transactionRequestDate = generateTransactionRequestDate();

    const refundData = {
      Action: "6",
      Amount_1: formattedRefundAmount,
      BankID: process.env.QPAY_BANK_ID.trim(),
      CurrencyCode: "634",
      Lang: "en",
      MerchantID: process.env.QPAY_MERCHANT_ID.trim(),
      OriginalTransactionPaymentUniqueNumber_1: ticket.pun,
      PUN_1: refundPUN,
      TransactionRequestDate: transactionRequestDate,
    };

    refundData.SecureHash = generateRefundSecureHash(refundData, process.env.QPAY_SECRET_KEY);

    const refundResponseRaw = await sendRefundRequest(refundData);
    const parsedResponse = require("querystring").parse(refundResponseRaw);

    const statusCode = parsedResponse["Response.Status_1"] || parsedResponse["Response.Status"];

    if (statusCode !== "5002") {
      let errorMsg;
      switch (statusCode) {
        case "5003":
          errorMsg = "A request has already been made. Please contact Bank to know the status";
          break;
        case "5004":
          errorMsg = "Original transaction not found for refund.";
          break;
        case "5006":
          errorMsg = "The provided currency does not match the original transaction's currency.";
          break;
        case "5007":
          errorMsg = "Abnormal error occurred while performing refund.";
          break;
        case "5008":
          errorMsg = "The refund amount cannot be higher than booking amount.";
          break;
        case "5011":
          errorMsg = "Refund rejected: transaction has a pending chargeback.";
          break;
        case "5012":
          errorMsg = "Refund rejected: transaction has already been charged back.";
          break;
        case "5013":
          errorMsg = "Original transaction for refund requires reversal.";
          break;
        case "5015":
          errorMsg = "The transaction is already refunded.";
          break;
        case "5018":
          errorMsg = "The original transaction is not a Pay transaction.";
          break;
        case "5019":
          errorMsg = "Payment validation failed.";
          break;
        case "8107":
          errorMsg = "Refund amount must be greater than 0.";
          break;
        case "8108":
          errorMsg = "Transaction currency not supported.";
          break;
        case "8200":
          errorMsg = "Current action is not supported for this merchant.";
          break;
        case "8201":
          errorMsg = "Current IP is not valid for this merchant.";
          break;
        case "8300":
          errorMsg = "Backend is inactive, refund cannot be performed.";
          break;
        case "9001":
          errorMsg = "Unknown backend error, please try again.";
          break;
        default:
          errorMsg = parsedResponse["Response.StatusMessage_1"] || "Unknown refund error.";
      }
      return next(new AppError(`Refund failed: ${errorMsg}`, 400));
    }

    ticket.paymentStatus = "Refund Processing";
    ticket.refundPun = refundPUN;
    await ticket.save();

    const updatedTicket = await Ticket.findById(ticket._id);
    console.log("Updated Ticket Data:", updatedTicket);

    const refundRecord = await Refund.findOne({ ticketId: ticket._id });
    if (refundRecord) {
      refundRecord.status = "Processing";
      refundRecord.refundAmount = refundAmount;
      await refundRecord.save();
    }

    return res.status(200).json({
      status: "success",
      message: "Refund request initiated via QPay",
      data: { refundRequest: refundData, refundResponse: parsedResponse },
    });
  }
});

/**
 * requestRefund:
 * - Expects req.body to contain { uniqueId, reason }
 * - Creates a refund record in the Refund collection,
 *   sends an email notification to the admin, and returns a success message.
 */
exports.requestRefund = async (req, res) => {
  try {
    const { uniqueId, reason } = req.body;
    console.log("Debug:", uniqueId, reason);

    if (!uniqueId || !reason) {
      return res.status(400).json({ error: "uniqueId and reason are required." });
    }

    const ticket = await Ticket.findOne({ uniqueId: uniqueId });
    if (!ticket) {
      return res
        .status(404)
        .json({ error: "Ticket not found!. Please Check the Booking ID again" });
    }

    // Check if a refund request already exists for this ticket with status Pending or Processing
    const existingRefund = await Refund.findOne({
      ticketId: ticket._id,
      status: { $in: ["Pending", "Processing"] },
    });
    if (existingRefund) {
      return res.status(400).json({
        error: "A refund request for this ticket already exists.",
      });
    }

    // Create new Refund record using the ticket's ObjectId
    const refund = new Refund({
      ticketId: ticket._id,
      reason,
      paymentMethod: ticket.paymentMethod,
      status: "Pending",
    });
    await refund.save();
    console.log("Refund record created successfully.");

    // (Optional) Send email notification to admin about the new refund request
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL,
      to: process.env.EMAIL,
      subject: "New Refund Request",
      text: `The booking with unique ID ${uniqueId} (Ticket ID: ${ticket._id}) has requested a refund. Reason: ${reason}`,
    };

    await transporter.sendMail(mailOptions);
    console.log("Admin notification email sent successfully.");

    return res.status(200).json({
      message: "Refund request submitted successfully!",
      refundId: refund._id,
    });
  } catch (error) {
    console.error("Error in requestRefund:", error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * getRefundRequests:
 * - Fetches all refund records from the Refund collection.
 * - Populates related ticket details.
 * - Returns the refund data for the admin panel.
 */
exports.getRefundRequests = catchAsync(async (req, res, next) => {
  console.log("Fetching all refund requests for admin panel...");

  // Only select refunds where ticketId is not null
  const refunds = await Refund.find({ ticketId: { $ne: null } })
    .populate("ticketId")
    .populate("ticketId", "uniqueId firstName lastName email paymentStatus");

  console.log(refunds);

  return res.status(200).json({
    status: "success",
    data: { refunds },
  });
});

/**
 * rejectRefundRequest:
 * - Expects req.body to contain { ticketId }.
 * - Looks up the ticket and the corresponding refund record.
 * - Updates the ticket's paymentStatus to "Refund Rejected By DohaBus"
 *   and sets the refund record's status to "Rejected".
 * - Returns a success message along with the updated documents.
 */
exports.rejectRefundRequest = catchAsync(async (req, res, next) => {
  const { ticketId } = req.body;
  if (!ticketId) {
    return next(new AppError("ticketId is required", 400));
  }

  // Find the ticket by its ObjectId
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) {
    return next(new AppError("Ticket not found", 404));
  }

  // Update the ticket's paymentStatus to indicate the refund was rejected by DohaBus
  ticket.paymentStatus = "Refund Rejected By DohaBus";
  await ticket.save();

  // Find and update the corresponding refund record (if one exists)
  const refundRecord = await Refund.findOne({ ticketId: ticket._id });
  if (refundRecord) {
    refundRecord.status = "Rejected";
    await refundRecord.save();
  }

  console.log("Ticket and refund record updated for refund rejection.");

  return res.status(200).json({
    status: "success",
    message: "Refund request rejected by DohaBus and database updated.",
    data: { ticket, refundRecord: refundRecord || null },
  });
});
