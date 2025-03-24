const nodemailer = require("nodemailer");
const crypto = require("crypto");
const axios = require("axios");
const dotenv = require("dotenv");
const qs = require("querystring");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const Ticket = require("../models/ticketModel");
const Refund = require("../models/refundModel");
const cybersourceRestApi = require("cybersource-rest-client");

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
  console.log("✅ Ticket Pulled:", ticket);

  if (!ticket) {
    return next(new AppError("Ticket not found", 404));
  }

  if (ticket.paymentStatus !== "Paid") {
    return next(new AppError("Only paid tickets can be refunded", 400));
  }

  if (ticket.paymentMethod === "cybersource") {
    const configObject = {
      authenticationType: "http_signature",
      runEnvironment: "api.cybersource.com", // Change to 'api.cybersource.com' for production
      enableLog: true,
      merchantID: process.env.CYBERSOURCE_MERCHANT_ID.trim(),
      merchantKeyId: process.env.CYBERSOURCE_SHARED_API_KEY_ID.trim(),
      merchantsecretKey: process.env.CYBERSOURCE_SHARED_API_SECRET.trim(),
      logFileName: "cybersource.log",
    };

    // Initialize the API client with your configuration
    const apiClient = new cybersourceRestApi.ApiClient();
    apiClient.merchantConfig = new cybersourceRestApi.MerchantConfig(configObject);
    // Create an instance of the RefundApi
    const refundApi = new cybersourceRestApi.RefundApi(apiClient);

    // Build the refund request object
    const requestObj = new cybersourceRestApi.CreateRefundRequest();
    requestObj.clientReferenceInformation = {
      code: ticket.transactionId, // Use your transaction ID here
    };
    requestObj.orderInformation = {
      amountDetails: {
        totalAmount: Number(refundAmount).toFixed(2),
        currency: "QAR",
      },
    };

    // Use the CyberSource payment id (from your ticket object) as the payment ID
    const paymentId = ticket.cybersourceConfirmationId;

    console.log("Processing CyberSource refund using SDK...");

    refundApi.createRefund(paymentId, requestObj, (error, data, response) => {
      if (error) {
        console.error("Error during refund:", error);
        return next(new AppError("CyberSource refund request error: " + error.message, 500));
      } else {
        console.log("CyberSource Refund Response:", data);

        // Check the response status and update your ticket/refund record accordingly
        if (
          data.status === "PENDING" ||
          (data.processorInformation && data.processorInformation.responseCode === "100")
        ) {
          ticket.paymentStatus = "Refund Processing";
          ticket.refundTransactionId = data.id;
          ticket
            .save()
            .then(() => {
              return Refund.findOne({ ticketId: ticket._id });
            })
            .then((refundRecord) => {
              if (refundRecord) {
                refundRecord.status = "Processing";
                refundRecord.refundAmount = refundAmount;
                return refundRecord.save();
              }
            })
            .then(() => {
              return res.status(200).json({
                status: "success",
                message: "Refund request initiated via CyberSource SDK",
                data: { refundResponse: data },
              });
            })
            .catch((saveError) => {
              console.error("Error saving ticket/refund record:", saveError);
              return next(new AppError("Error saving refund details", 500));
            });
        } else {
          let errorMsg = "";
          const code = data.processorInformation?.responseCode;
          switch (code) {
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
              errorMsg = data.message || "Unknown refund error.";
          }
          return next(new AppError(`Refund failed: ${errorMsg}`, 400));
        }
      }
    });
    //     console.log("Processing CyberSource refund using REST API...");
    //
    //     const refundEndpoint = `https://api.cybersource.com/pts/v2/payments/${ticket.cybersourceConfirmationId}/refunds`;
    //     console.log("Refund Endpoint:", refundEndpoint);
    //
    //     const refundPayload = {
    //       clientReferenceInformation: {
    //         code: ticket.transactionId,
    //       },
    //       orderInformation: {
    //         amountDetails: {
    //           totalAmount: Number(refundAmount).toFixed(2),
    //           currency: "QAR",
    //         },
    //       },
    //     };
    //
    //     const payloadString = JSON.stringify(refundPayload);
    //     console.log("Payload JSON:", payloadString);
    //
    //     // Compute the digest exactly on the payload string
    //     const digest =
    //       "SHA-256=" +
    //       crypto
    //         .createHash("sha256")
    //         .update(payloadString)
    //         .digest("base64");
    //     console.log("Digest:", digest);
    //
    //     const vCDate = new Date().toUTCString();
    //     console.log("Date (UTC):", vCDate);
    //
    //     const host = "api.cybersource.com";
    //     // Use lowercase for the HTTP method in (request-target)
    //     const requestTarget = `post /pts/v2/payments/${ticket.cybersourceConfirmationId}/refunds`;
    //
    //     // Trim environment variables to remove any hidden spaces
    //     const vCMerchantId = process.env.CYBERSOURCE_MERCHANT_ID?.trim();
    //     const keyId = process.env.CYBERSOURCE_SHARED_API_KEY_ID?.trim();
    //     const secretKey = process.env.CYBERSOURCE_SHARED_API_SECRET?.trim();
    //
    //     console.log("ENV Debug Logs:");
    //     console.log("CYBERSOURCE_MERCHANT_ID:", vCMerchantId);
    //     console.log("CYBERSOURCE_ACCESS_KEY:", keyId);
    //     console.log("CYBERSOURCE_SECRET_KEY (first 10 chars):", secretKey?.slice(0, 10) + "...");
    //
    //     // Build the signing string using an array join to ensure no extra whitespace
    //     const signingString = [
    //       "host: " + host,
    //       "date: " + vCDate,
    //       "(request-target): " + requestTarget,
    //       "digest: " + digest,
    //       "v-c-merchant-id: " + vCMerchantId,
    //     ].join("\n");
    //
    //     console.log("Signing String:\n" + signingString);
    //
    //     const computedSignature = crypto
    //       .createHmac("sha256", secretKey)
    //       .update(signingString)
    //       .digest("base64");
    //
    //     console.log("Computed Signature:", computedSignature);
    //
    //     const signatureHeader = `keyid="${keyId}", algorithm="HmacSHA256", headers="host date (request-target) digest v-c-merchant-id", signature="${computedSignature}"`;
    //
    //     const headers = {
    //       host,
    //       signature: signatureHeader,
    //       digest,
    //       "v-c-merchant-id": vCMerchantId,
    //       date: vCDate,
    //       "Content-Type": "application/json",
    //     };
    //
    //     console.log("Final Request Headers:", headers);
    //
    //     try {
    //       const response = await axios.post(refundEndpoint, refundPayload, { headers });
    //       console.log("CyberSource Refund Response:", response.data);
    //
    //       if (
    //         response.data.status === "PENDING" ||
    //         (response.data.processorInformation &&
    //           response.data.processorInformation.responseCode === "100")
    //       ) {
    //         ticket.paymentStatus = "Refund Processing";
    //         ticket.refundTransactionId = response.data.id;
    //         await ticket.save();
    //
    //         const refundRecord = await Refund.findOne({ ticketId: ticket._id });
    //         if (refundRecord) {
    //           refundRecord.status = "Processing";
    //           refundRecord.refundAmount = refundAmount;
    //           await refundRecord.save();
    //         }
    //
    //         return res.status(200).json({
    //           status: "success",
    //           message: "Refund request initiated via CyberSource REST API",
    //           data: { refundResponse: response.data },
    //         });
    //       } else {
    //         let errorMsg = "";
    //         const code = response.data.processorInformation?.responseCode;
    //         switch (code) {
    //           case "101":
    //             errorMsg = "Invalid refund amount.";
    //             break;
    //           case "102":
    //             errorMsg = "Refund not allowed for this transaction.";
    //             break;
    //           case "150":
    //             errorMsg = "Original transaction has not been settled yet.";
    //             break;
    //           case "200":
    //             errorMsg = "Refund already processed.";
    //             break;
    //           case "300":
    //             errorMsg = "Authentication error during refund processing.";
    //             break;
    //           default:
    //             errorMsg = response.data.message || "Unknown refund error.";
    //         }
    //         return next(new AppError(`Refund failed: ${errorMsg}`, 400));
    //       }
    //     } catch (error) {
    //       console.error("CyberSource refund request error:", error.response?.data || error.message);
    //       console.error("full response", error);
    //       return next(new AppError("CyberSource refund request error: " + error.message, 500));
    //     }
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
