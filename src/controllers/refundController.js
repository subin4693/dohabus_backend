const nodemailer = require("nodemailer");
const crypto = require("crypto");
const axios = require("axios");
const dotenv = require("dotenv");
const qs = require("querystring");
const AppError = require("../utils/appError");
const cybersourceRestApi = require("cybersource-rest-client");
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
  console.log("✅ Ticket Pulled:", ticket);

  if (!ticket) {
    return next(new AppError("Ticket not found", 404));
  }

  if (ticket.paymentStatus !== "Paid") {
    return next(new AppError("Only paid tickets can be refunded", 400));
  }

  if (ticket.paymentMethod === "cybersource") {
    console.log(`🔄 Initiating CyberSource refund for ticket: ${ticketId}`);

    // Inline configuration using environment variables (fallbacks provided for local testing)
    const configObject = {
      authenticationType: process.env.CYBERSOURCE_AUTH_TYPE || "http_signature",
      runEnvironment: process.env.CYBERSOURCE_RUN_ENVIRONMENT || "api.cybersource.com",
      merchantID: process.env.CYBERSOURCE_MERCHANT_ID || "testrest",
      merchantKeyId:
        process.env.CYBERSOURCE_SHARED_API_KEY_ID || "08c94330-f618-42a3-b09d-e1e43be5efda",
      merchantsecretKey:
        process.env.CYBERSOURCE_SHARED_API_SECRET || "yBJxy6LjM2TmcPGu+GaJrHtkke25fPpUX+UY6/L/1tE=",
      // Logging configuration: enabled logging and disabled masking
      logConfiguration: {
        enableLog: true,
        logFileName: "cybs",
        logDirectory: "log",
        logFileMaxSize: "5242880", // 5 MB (example value)
        loggingLevel: "debug",
        enableMasking: false,
      },
    };

    // Initialize the API client and Refund API with the inline configuration
    const apiClient = new cybersourceRestApi.ApiClient();
    const refundsApi = new cybersourceRestApi.RefundApi(configObject, apiClient);

    // Build the Refund Payment Request object
    const requestObj = new cybersourceRestApi.RefundPaymentRequest();

    // Set client reference information
    const clientReferenceInformation = new cybersourceRestApi.Ptsv2paymentsidrefundsClientReferenceInformation();
    clientReferenceInformation.code = `TC50171_${ticketId}`;
    requestObj.clientReferenceInformation = clientReferenceInformation;

    // Set order information (refund amount and currency)
    const orderInformation = new cybersourceRestApi.Ptsv2paymentsidrefundsOrderInformation();
    const orderInformationAmountDetails = new cybersourceRestApi.Ptsv2paymentsidcapturesOrderInformationAmountDetails();
    orderInformationAmountDetails.totalAmount = refundAmount.toString();
    orderInformationAmountDetails.currency = "QAR";
    orderInformation.amountDetails = orderInformationAmountDetails;
    requestObj.orderInformation = orderInformation;

    console.log("📝 Refund Request Object:", JSON.stringify(requestObj, null, 2));

    // Use the CyberSource confirmation ID stored in the ticket as the payment ID
    const paymentId = ticket.cybersourceConfirmationId;
    if (!paymentId) {
      console.error("❌ No CyberSource confirmation ID found in ticket.");
      return next(new AppError("No CyberSource confirmation ID found in ticket", 400));
    }
    console.log("💳 Payment ID to refund:", paymentId);

    // Execute the refundPayment request
    refundsApi.refundPayment(requestObj, paymentId, async function(error, data, response) {
      if (error) {
        console.error("❌ Refund Payment error:", JSON.stringify(error, null, 2));
        return next(new AppError("Refund processing failed", 500));
      }
      console.log("✅ Refund Payment successful. Data:", JSON.stringify(data, null, 2));
      console.log("🔄 Refund Response:", JSON.stringify(response, null, 2));
      console.log("Response Code of Refund Payment:", response.status);

      // Update the Ticket and Refund records in the DB based on the response
      try {
        // Update the ticket: mark it as refund processing and store the refund ID from CyberSource
        ticket.paymentStatus = "Refund Processing";
        // We store the CyberSource refund ID in the refundPun field for tracking
        ticket.refundPun = data.id || "";
        await ticket.save();
        console.log("✅ Ticket updated with refund status and refund ID.");

        // Update the Refund record if it exists, or create a new one
        let refundRecord = await Refund.findOne({ ticketId: ticket._id });
        if (refundRecord) {
          refundRecord.status = "Processing";
          refundRecord.refundAmount = refundAmount;
          // Optionally, you can store additional CyberSource response data if needed
          await refundRecord.save();
          console.log("✅ Refund record updated.");
        } else {
          refundRecord = await Refund.create({
            ticketId: ticket._id,
            paymentMethod: ticket.paymentMethod,
            status: "Processing",
            refundAmount: refundAmount,
          });
          console.log("✅ Refund record created.");
        }
      } catch (dbError) {
        console.error("❌ Error updating DB:", dbError);
        return next(new AppError("Refund processed but failed to update DB", 500));
      }

      return res.status(200).json({
        status: "success",
        message: "Refund request initiated via CyberSource and DB updated",
        data: data,
      });
    });
  } else {
    // QPay refund processing (leave unchanged)
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
      refundRecord.status = "Processing Refund";
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
      status: { $in: ["Pending Approval", "Processing Refund"] },
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
      status: "Pending Approval",
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
