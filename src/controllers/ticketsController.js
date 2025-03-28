const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const Plan = require("../models/planModel");
const Category = require("../models/categoryModel");
const Offer = require("../models/offerModel");
const User = require("../models/userModel");
const Ticket = require("../models/ticketModel");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const { v4: uuidv4 } = require("uuid");
const CryptoJS = require("crypto-js");
const crypto = require("crypto");
const axios = require("axios");
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

const esignature = `
    <div style="margin-left: 10px;">
        <p style="font-family: Arial, sans-serif; color: #333;"><b>Best regards,</b></p>
        <p style="font-family: Arial, sans-serif; color: #333;"><b>Doha Bus</b></p>
    </div>
    <div style="display: flex; justify-content: center; align-items: center; margin-top: 10px; padding: 10px;">
      <div style="display: flex; align-items: center; justify-content:center;">
         <div>
           <img src="https://eng.dohabus.com/English/images/LOGOFOOTER.png" alt="Signature Image" style="width: 100px; height: 100px; margin-right: 10px; object-fit: cover;">
         </div>
         <div>
           <h1 style="color: yellow; font-size: 2rem; margin: 0;"><b>Doha Bus</b></h1>
         </div>
      </div>
    </div>
`;

/**
 * Helper function for CyberSource: sign an object using HMAC SHA256.
 * Expects a data object that contains a comma‐separated string field "signed_field_names".
 */
const sign = (data, secretKey) => {
  const orderedFields = data.signed_field_names.split(",");
  const signingString = orderedFields.map((field) => `${field}=${data[field]}`).join(",");
  const hmac = crypto.createHmac("sha256", secretKey);
  hmac.update(signingString);
  return hmac.digest("base64");
};

// -----------------------
// BOOK TICKET FUNCTION (Supports both QPay and CyberSource)
// -----------------------
exports.bookTicket = catchAsync(async (req, res, next) => {
  console.log("DEBUG: bookTicket invoked.");
  console.log("DEBUG: req.body.dataa:", req.body.dataa);

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
    // New field for choosing payment provider: "qpay" or "cybersource"
    paymentMethod = "qpay",
  } = req.body.dataa;

  try {
    const planDetails = await Plan.findById(plan);
    const planCategory = await Category.findById(category);
    const userDetails = { name: firstName };

    if (!planDetails) {
      console.error("ERROR: Invalid plan selected");
      return next(new AppError("Invalid plan selected", 400));
    }

    const planObject = planDetails.toObject();
    let {
      childPrice,
      adultPrice,
      adultData,
      childData,
      addOn,
      minPerson,
      pricingLimits,
    } = planObject;

    if (date) {
      const normalizedSelectedDate = new Date(date);
      normalizedSelectedDate.setHours(0, 0, 0, 0);
      console.log("DEBUG: Normalized date:", normalizedSelectedDate);
      const currentPricingLimit = pricingLimits.find((limit) => {
        const startDate = new Date(limit.startDate);
        const endDate = new Date(limit.endDate);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);
        return date >= startDate && date <= endDate;
      });
      if (currentPricingLimit) {
        childPrice = currentPricingLimit.childPrice ?? null;
        adultPrice = currentPricingLimit.adultPrice ?? null;
        adultData = currentPricingLimit.adultData?.length ? currentPricingLimit.adultData : null;
        childData = currentPricingLimit.childData?.length ? currentPricingLimit.childData : null;
      }
    }

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
      console.error("ERROR: Not enough tickets available.");
      return res.status(400).json({
        message: `Only ${availableTickets} tickets are available for this session.`,
      });
    }
    if (minPerson > 0 && minPerson > adultQuantity + childQuantity) {
      console.error("ERROR: Minimum person requirement not met.");
      return res.status(400).json({
        message: `The minimum persons count should be ${minPerson}. You have selected ${adultQuantity +
          childQuantity}.`,
      });
    }

    let totalAdultPrice = 0,
      totalChildPrice = 0;
    if (adultPrice || childPrice) {
      totalAdultPrice = adultPrice * adultQuantity || 0;
      totalChildPrice = childPrice * childQuantity || 0;
    } else {
      // Adult Data Calculation
      if (adultData && adultQuantity > 0) {
        const sortedAdultData = adultData.sort((a, b) => a.pax - b.pax);
        const minAdultPax = sortedAdultData[0]?.pax;
        if (adultQuantity < minAdultPax) {
          console.error("ERROR: Adult quantity below minimum required.");
          return res.status(400).json({
            message: `The minimum adult count should be ${minAdultPax}. You have selected ${adultQuantity}.`,
          });
        }
        const selectedAdultData = sortedAdultData
          .filter((adult) => adult.pax <= adultQuantity)
          .pop();
        totalAdultPrice = selectedAdultData ? selectedAdultData.price * adultQuantity : 0;
      }
      // Child Data Calculation
      if (childData && childQuantity > 0) {
        const sortedChildData = childData.sort((a, b) => a.pax - b.pax);
        const minChildPax = sortedChildData[0]?.pax;
        if (childQuantity < minChildPax) {
          console.error("ERROR: Child quantity below minimum required.");
          return res.status(400).json({
            message: `The minimum child count should be ${minChildPax}. You have selected ${childQuantity}.`,
          });
        }
        const selectedChildData = sortedChildData
          .filter((child) => child.pax <= childQuantity)
          .pop();
        totalChildPrice = selectedChildData ? selectedChildData.price * childQuantity : 0;
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
        console.error("ERROR: Invalid or expired coupon.");
        return next(new AppError("Invalid or expired coupon code", 400));
      }
      const { limit } = couponDetails;
      const userTicketCount = await Ticket.countDocuments({
        plan,
        offer: couponDetails._id,
        email,
      });
      if (userTicketCount >= limit && limit > 0) {
        console.error("ERROR: Coupon usage limit reached.");
        return next(new AppError(`Coupon code can only be used ${limit} time(s) per user`, 400));
      }
      offer = couponDetails._id;
      const currentDate = new Date();
      if (date < couponDetails.startingDate || date > couponDetails.endingDate) {
        console.error("ERROR: Coupon code not valid at this time.");
        return next(new AppError("Coupon code is not valid at this time", 400));
      }
      if (couponDetails.adultDiscountType === "percentage" && adultQuantity > 0) {
        adultDiscountAmount = (totalAdultPrice * couponDetails.adultDiscountPrice) / 100;
      } else if (couponDetails.adultDiscountType === "price" && adultQuantity > 0) {
        adultDiscountAmount = couponDetails.adultDiscountPrice;
      }
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
    }

    // Generate a new unique ticket ID
    const latestTicket = await Ticket.findOne().sort({ uniqueId: -1 });
    const newIdNumber = latestTicket ? parseInt(latestTicket.uniqueId) + 1 : 1;
    const newUniqueId = String(newIdNumber).padStart(5, "0");

    const allcost = totalCost + addOnTotalPrice;

    // Generate a transaction identifier.
    // For QPay we use our own transactionId, for CyberSource we will generate a UUID.
    const transactionId =
      paymentMethod === "qpay"
        ? `TRX-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 15)}`
        : uuidv4();

    // -----------------------
    // Payment Data Preparation
    // -----------------------
    if (paymentMethod === "qpay") {
      console.log("Payment Method === qpay");
      // -----------------------
      // QPay Payment Processing
      // -----------------------
      console.log("DEBUG: Preparing QPay payment data...");
      const REDIRECT_URL = process.env.QPAY_REDIRECT_URL;
      const onSuccessRedirect = process.env.QPAY_RETURN_URL;

      const generateSecureHash = (data, secretKey) => {
        const fieldsOrder = [
          "Action",
          "Amount",
          "BankID",
          "CurrencyCode",
          "ExtraFields_f14",
          "Lang",
          "MerchantID",
          "MerchantModuleSessionID",
          "NationalID",
          "PUN",
          "PaymentDescription",
          "Quantity",
          "TransactionRequestDate",
        ];
        let hashString = secretKey;
        fieldsOrder.forEach((field) => {
          const fieldValue = data[field] ? data[field].toString().trim() : "";
          hashString += fieldValue;
        });
        return crypto
          .createHash("sha256")
          .update(hashString)
          .digest("hex");
      };

      const generateTransactionDate = () => {
        const now = new Date();
        return now
          .toISOString()
          .replace(/[-:.TZ]/g, "")
          .substring(0, 14);
      };

      const generatePUN = () => {
        return crypto
          .randomBytes(10)
          .toString("hex")
          .substring(0, 20)
          .toUpperCase();
      };

      // Generate the PUN for QPay and store it.
      const truncatedPUN = generatePUN();
      const formattedAmount = Math.round(parseFloat(allcost) * 100).toString();
      console.log("DEBUG: Generated truncatedPUN for payment:", truncatedPUN);

      const merchantId = process.env.QPAY_MERCHANT_ID;
      const bankId = process.env.QPAY_BANK_ID;
      const language = "en"; // Default language
      const paymentDescription = `Ticket booking for ${planDetails.name} - Adults: ${adultQuantity}, Children: ${childQuantity}`;

      const paymentData = {
        Action: "0",
        Amount: formattedAmount,
        BankID: bankId.trim(),
        CurrencyCode: "634",
        ExtraFields_f14: onSuccessRedirect,
        Lang: language,
        MerchantID: merchantId.trim(),
        MerchantModuleSessionID: truncatedPUN,
        NationalID: "",
        PUN: truncatedPUN,
        PaymentDescription: paymentDescription.trim(),
        Quantity: "1",
        TransactionRequestDate: generateTransactionDate(),
      };

      paymentData.SecureHash = generateSecureHash(paymentData, process.env.QPAY_SECRET_KEY);
      console.log("DEBUG: Payment Data prepared:", paymentData);

      // Create ticket in the DB, including the PUN field.
      console.log("DEBUG: Creating ticket in DB...");
      const ticket = await Ticket.create({
        uniqueId: newUniqueId,
        paymentMethod: paymentMethod,
        category,
        plan,
        price: allcost || 0,
        adultQuantity: adultQuantity || 0,
        childQuantity: childQuantity || 0,
        session,
        date,
        firstName,
        offer,
        transactionId, // For QPay this is our custom TRX id; for CyberSource it is a UUID.
        paymentStatus: "Pending",
        email,
        pickupLocation,
        dropLocation,
        discountAmount: adultDiscountAmount + childDiscountAmount || 0,
        addonFeatures,
        status: "Booked",
        number,
        pickupTime,
        pun: truncatedPUN, // Store the generated PUN
      });
      // console.log("DEBUG: Ticket with PUN stored:", ticket);

      // Log the backend's static IP by fetching it from an external service.
      const ipResponse = await axios.get("https://api64.ipify.org?format=json");
      const backendIP = ipResponse.data.ip;
      console.log("DEBUG: Backend Static IP:", backendIP);

      // Instead of sending JSON, return an HTML page with a hidden form that auto-submits.
      const formInputs = Object.entries(paymentData)
        .map(([key, value]) => `<input type="hidden" name="${key}" value="${value}" />`)
        .join("");
      return res.status(200).send(`
        <html>
          <body onload="document.forms[0].submit()">
            <form method="POST" action="${REDIRECT_URL}">
              ${formInputs}
            </form>
          </body>
        </html>
      `);
    } else if (paymentMethod === "cybersource") {
      // -----------------------
      // CyberSource Payment Processing
      // -----------------------
      console.log("DEBUG: Preparing CyberSource payment data...");
      const {
        CYBERSOURCE_PROFILE_ID,
        CYBERSOURCE_ACCESS_KEY,
        CYBERSOURCE_SECRET_KEY,
      } = process.env;

      // Generate a transaction UUID (already stored as transactionId)
      const transactionUuid = transactionId;
      const signedDateTime = new Date().toISOString().split(".")[0] + "Z";

      const signedFieldNames = [
        "access_key",
        "profile_id",
        "transaction_uuid",
        "signed_field_names",
        "signed_date_time",
        "transaction_type",
        "reference_number",
        "amount",
        "currency",
        "locale",
        "device_fingerprint_id",
        "override_custom_cancel_page",
        "override_custom_receipt_page",
      ];

      const deviceFingerprintId = req.body.dataa.deviceFingerprintId || "";

      const fieldsToSign = {
        access_key: CYBERSOURCE_ACCESS_KEY,
        profile_id: CYBERSOURCE_PROFILE_ID,
        transaction_uuid: transactionUuid,
        signed_field_names: signedFieldNames.join(","),
        signed_date_time: signedDateTime,
        transaction_type: "sale",
        reference_number: transactionId, // using our transactionId as reference
        amount: allcost.toString(),
        currency: "qar",
        locale: "en-us",
        device_fingerprint_id: deviceFingerprintId,
        override_custom_cancel_page: process.env.CYBERSOURCE_RETURN_UR,
        override_custom_receipt_page: process.env.CYBERSOURCE_RETURN_UR,
      };

      const signature = sign(fieldsToSign, CYBERSOURCE_SECRET_KEY);
      const paymentUrl = "https://secureacceptance.cybersource.com/pay";

      console.log("DEBUG: CyberSource payment parameters generated:", {
        ...fieldsToSign,
        signature,
      });

      // Log the backend's static IP by fetching it from an external service.
      const ipResponse = await axios.get("https://api64.ipify.org?format=json");
      const backendIP = ipResponse.data.ip;
      console.log("DEBUG: Backend Static IP:", backendIP);

      const ticket = await Ticket.create({
        uniqueId: newUniqueId,
        paymentMethod: paymentMethod,
        category,
        plan,
        price: allcost,
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
        pun: null, // CyberSource doesn't use PUN
      });

      // Return an HTML page with an auto-submitting form for CyberSource.
      const formInputs = Object.entries({ ...fieldsToSign, signature })
        .map(([key, value]) => `<input type="hidden" name="${key}" value="${value}" />`)
        .join("");
      return res.status(200).send(`
        <html>
          <body onload="document.forms[0].submit()">
            <form method="POST" action="${paymentUrl}">
              ${formInputs}
            </form>
          </body>
        </html>
      `);
    } else {
      console.error("ERROR: Unknown payment method:", paymentMethod);
      return next(new AppError("Invalid payment method", 400));
    }
  } catch (error) {
    console.error("Booking failed:", error.message);
    next(new AppError(error.message, 500));
  }
});

const mapQPayErrorCode = (code) => {
  // Mapping from QPay EZ‑Connect Integration Guide Appendix B
  const errorMap = {
    "EZConnect-0001": "Missing 'Action' parameter.",
    "EZConnect-0002": "Missing 'BankID' parameter.",
    "EZConnect-0003": "Missing 'PUN' parameter.",
    "EZConnect-0004": "Missing 'MerchantID' parameter.",
    "EZConnect-0005": "Merchant is not available.",
    "EZConnect-0006": "Merchant is not configured for EZ‑Connect.",
    "EZConnect-0007": "Merchant has no configured secret key.",
    "EZConnect-0008": "Merchant IP is not supported.",
    "EZConnect-0009": "Secure Hash could not be validated.",
    "EZConnect-0010": "Missing 'SecureHash' parameter.",
    "EZConnect-0012": "Missing 'Lang' parameter.",
    "EZConnect-0013": "Missing 'OriginalTransactionPaymentUniqueNumber' parameter.",
    "EZConnect-0014": "Missing 'Amount' parameter.",
    "EZConnect-0015": "Missing 'CurrencyCode' parameter.",
    "EZConnect-0016": "Invalid amount value received.",
    "EZConnect-0017": "Invalid amount format received.",
    "EZConnect-0018": "Invalid action type sent.",
    "EZConnect-0019": "Missing 'TransactionRequestDate' parameter.",
    // Add additional mappings as needed
  };
  return errorMap[code] || null;
};

exports.handleQPayResponse = async (req, res) => {
  console.log("DEBUG: handleQPayResponse invoked.");
  console.log("DEBUG: Raw QPay response (req.body):", JSON.stringify(req.body));
  try {
    const responseParams = Object.keys(req.body).length > 0 ? req.body : req.query;
    console.log("DEBUG: Parsed responseParams:", responseParams);

    if (!responseParams || !responseParams["Response.SecureHash"]) {
      console.error("ERROR: Missing Secure Hash in QPay Response:", responseParams);
      return res.status(400).json({
        status: "error",
        message: "Missing Secure Hash in Response",
        receivedData: responseParams,
      });
    }

    const receivedSecureHash = responseParams["Response.SecureHash"];
    console.log("DEBUG: Received Secure Hash:", receivedSecureHash);
    const fieldsOrder = [
      "Response.AcquirerID",
      "Response.Amount",
      "Response.BankID",
      "Response.CardExpiryDate",
      "Response.CardHolderName",
      "Response.CardNumber",
      "Response.ConfirmationID",
      "Response.CurrencyCode",
      "Response.EZConnectResponseDate",
      "Response.Lang",
      "Response.MerchantID",
      "Response.MerchantModuleSessionID",
      "Response.PUN",
      "Response.Status",
      "Response.StatusMessage",
    ];

    let hashString = process.env.QPAY_SECRET_KEY;
    fieldsOrder.forEach((field) => {
      let value = (responseParams[field] || "").trim();
      // Replace spaces with '+' in any message field (per documentation)
      if (field.toLowerCase().includes("message")) {
        value = value.replace(/ /g, "+");
      }
      hashString += value;
    });

    const generatedSecureHash = crypto
      .createHash("sha256")
      .update(hashString)
      .digest("hex");
    console.log("DEBUG: Generated Secure Hash:", generatedSecureHash);

    if (receivedSecureHash !== generatedSecureHash) {
      console.error(
        "ERROR: Invalid Secure Hash! Expected:",
        generatedSecureHash,
        "Received:",
        receivedSecureHash,
      );
      return res.status(400).json({ status: "error", message: "Invalid secure hash" });
    }

    const punFromResponse = (responseParams["Response.PUN"] || "").toUpperCase().trim();
    console.log("DEBUG: Normalized PUN from response:", punFromResponse);

    const ticket = await Ticket.findOne({
      pun: { $regex: new RegExp(`^${punFromResponse}$`, "i") },
    })
      .populate("plan")
      .populate("category");

    if (!ticket) {
      console.error("ERROR: No ticket found with PUN:", punFromResponse);
      return res.status(404).json({ status: "error", message: "Ticket not found" });
    }
    console.log("DEBUG: Ticket found:", ticket);

    const responseStatus = responseParams["Response.Status"];
    ticket.paymentStatus = responseStatus === "0000" ? "Paid" : "Failed";
    ticket.confirmationId = responseParams["Response.ConfirmationID"];
    console.log("DEBUG: Updating ticket payment status to:", ticket.paymentStatus);
    await ticket.save();
    console.log("DEBUG: Ticket updated:", ticket);

    // If the status code is not success, map it to a friendly message if available
    let message = responseParams["Response.StatusMessage"];

    if (ticket.paymentStatus === "Paid") {
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
    <td style="border: 1px solid #ccc; padding: 8px;">${ticket?.firstName} ${ticket?.lastName}</td>
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
    }

    if (responseStatus !== "0000") {
      const friendlyMsg = mapQPayErrorCode(responseStatus);
      if (friendlyMsg) {
        message = friendlyMsg;
      }
    }

    const queryParams = new URLSearchParams({
      status: responseStatus,
      message: message,
      ticketId: ticket._id.toString(),
    }).toString();
    console.log("DEBUG: Redirecting with queryParams:", queryParams);
    return res.redirect(`${process.env.PAYMENT_RESPONSE_URL}/?${queryParams}`);
  } catch (error) {
    console.error("Error handling QPay response:", error);
    return res.redirect(
      `${process.env.PAYMENT_RESPONSE_URL}/?status=error&message=Failed to process response`,
    );
  }
};

const mapCyberSourceErrorCode = (code) => {
  // Mapping from Secure Acceptance documentation (expand as needed)
  const errorMap = {
    "100": "Payment processed successfully.",
    "101": "Payment declined: Card expired.",
    "102": "Payment declined: Insufficient funds.",
    "202": "Payment declined: Suspected fraud.",
    "4100": "Payment has been rejected due to risk rule violation.",
    // Additional mappings can be added here as needed.
  };
  return errorMap[code] || null;
};

exports.cybersourcePaymentResponse = async (req, res) => {
  console.log("DEBUG: CyberSource paymentResponse invoked.", req.body);
  try {
    const fields = { ...req.body };

    // Instead of verifying the signature, simply check the decision field.
    const decision = fields.decision ? fields.decision.toLowerCase() : "unknown";
    if (decision !== "accept") {
      let errorMessage = "";
      if (fields.reason_code) {
        errorMessage = mapCyberSourceErrorCode(fields.reason_code);
      }
      if (!errorMessage && fields.message) {
        errorMessage = fields.message;
      }
      if (!errorMessage) {
        errorMessage = "Payment was not accepted. Please try again.";
      }
      console.error(
        "ERROR: CyberSource payment declined with decision:",
        decision,
        "and reason code:",
        fields.reason_code,
      );
      return res.redirect(
        `${process.env.PAYMENT_RESPONSE_URL}?status=failed&message=${encodeURIComponent(
          errorMessage,
        )}&ticketId=${fields.ticketId || ""}`,
      );
    }

    // Retrieve the ticket based on the transaction reference (using reference_number here)
    const referenceNumber = fields.req_reference_number;
    const ticket = await Ticket.findOne({ transactionId: referenceNumber });
    console.log("Ticekt Found", ticket);

    if (ticket) {
      ticket.paymentMethod = ticket.paymentMethod || "cybersource";
      ticket.paymentStatus = "Paid";
      // Ensure the required paymentMethod field is set.
      ticket.cybersourceConfirmationId = fields.transaction_id || "";
      ticket.cybersourceOrderId = fields.auth_reconciliation_reference_number || "";
      await ticket.save();
      console.log("DEBUG: Ticket updated:", ticket);
    } else {
      console.error("ERROR: No ticket found with reference number:", referenceNumber);
    }

    if (ticket && ticket.paymentStatus === "Paid") {
      console.log("Payment successful, preparing email of CyberSource");

      const esignature = `
        <div style="margin-left: 10px;">
          <p style="font-family: Arial, sans-serif; color: #333;"><b>Best regards,</b></p>
          <p style="font-family: Arial, sans-serif; color: #333;"><b>Doha Bus</b></p>
        </div>
        <div style="display: flex; justify-content: center; align-items: center; margin-top: 10px; padding: 10px;">
          <div style="display: flex; align-items: center; justify-content: center;">
             <div>
               <img src="https://eng.dohabus.com/English/images/LOGOFOOTER.png" alt="Signature Image" style="width: 100px; height: 100px; margin-right: 10px; object-fit: cover;">
             </div>
             <div>
               <h1 style="color: yellow; font-size: 2rem; margin: 0;"><b>Doha Bus</b></h1>
             </div>
          </div>
        </div>
      `;

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
        <a href="https://dohabus.com/invoice/${
          ticket?._id
        }" style="color: #007bff; text-decoration: none; font-weight: bold;" target="_blank" rel="noopener noreferrer">
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
    <td style="border: 1px solid #ccc; padding: 8px;">${ticket?.firstName} ${ticket?.lastName}</td>
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
  <a href="https://dohabus.com/invoice/${
    ticket?._id
  }" style="color: #007bff; text-decoration: none; font-weight: bold;" target="_blank" rel="noopener noreferrer">
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
    }

    // Redirect to the frontend with a success message
    return res.redirect(
      `${process.env.PAYMENT_RESPONSE_URL}?status=success&message=Payment accepted.&ticketId=${
        ticket ? ticket._id.toString() : ""
      }`,
    );
  } catch (error) {
    console.error("Error handling CyberSource response:", error);
    return res.redirect(
      `${process.env.PAYMENT_RESPONSE_URL}?status=error&message=Failed to process payment response.`,
    );
  }
};

// -----------------------
// Other Ticket functions (getTickets, getAllTickets, deleteTicket, etc.)
// -----------------------

exports.getTickets = catchAsync(async (req, res, next) => {
  console.log("DEBUG: getTickets invoked.");
  const userId = req.query.user != "undefined" ? req.query.user : null;
  const tickets = [];
  res.status(200).json({
    status: "success",
    data: { tickets },
  });
});

exports.getAllTickets = catchAsync(async (req, res, next) => {
  console.log("DEBUG: getAllTickets invoked.");
  const tickets = await Ticket.find()
    .populate({ path: "plan", select: "title coverImage" })
    .populate({ path: "category", select: "title description" })
    .select(
      "firstName lastName email category plan price adultQuantity childQuantity date status pickupLocation dropLocation createdAt uniqueId paymentStatus",
    );
  res.status(200).json({
    status: "success",
    data: { tickets },
  });
});

exports.deleteTicket = catchAsync(async (req, res, next) => {
  console.log("DEBUG: deleteTicket invoked with id:", req.params.id);
  const ticketId = req.params.id;
  await Ticket.findByIdAndDelete(ticketId);
  res.status(200).json({ status: "success" });
});

exports.editTicket = catchAsync(async (req, res, next) => {
  console.log("DEBUG: editTicket invoked with id:", req.params.id);
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
  for (const t of ticketTest) {
    totalCost += t.price;
    totalQuantity += t.quantity;
  }
  res.status(201).json({
    status: "success",
    data: { bookedTickets: ticketTest },
  });
});

exports.getTicketCounts = catchAsync(async (req, res, next) => {
  try {
    const { date, planId } = req.body;
    if (!date || !planId) {
      console.error("ERROR: Date and Plan ID are required.");
      return res.status(400).json({ message: "Date and Plan ID are required" });
    }
    const targetDate = new Date(date);
    const plan = await Plan.findById(planId);
    if (!plan) {
      console.error("ERROR: Plan not found.");
      return res.status(404).json({ message: "Plan not found" });
    }
    const sessionLimit = plan.limit;
    const sessionCounts = {};
    const sessionStatus = {};
    for (const session of plan.sessions) {
      sessionCounts[session.name] = 0;
      sessionStatus[session.name] = "Available";
    }
    const tickets = await Ticket.find({ plan: planId, date: targetDate, status: "Booked" });
    tickets.forEach((ticket) => {
      if (sessionCounts.hasOwnProperty(ticket.session)) {
        sessionCounts[ticket.session] += ticket.adultQuantity + ticket.childQuantity;
      }
    });
    for (const session of plan.sessions) {
      if (sessionLimit > 0 && sessionCounts[session.name] >= sessionLimit) {
        sessionStatus[session.name] = "Full";
      } else if (sessionLimit > 0 && sessionCounts[session.name] >= sessionLimit / 2) {
        sessionStatus[session.name] = "Filling Up";
      }
    }
    return res.status(200).json({ sessionCounts, sessionStatus });
  } catch (error) {
    console.error("ERROR in getTicketCounts:", error);
    return res.status(500).json({ message: "Server Error" });
  }
});

exports.getTicketById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const ticket = await Ticket.findById(id);
  if (!ticket) {
    console.error("ERROR: Ticket not found for id:", id);
    return next(new AppError("Ticket not found", 404));
  }
  const plan = await Plan.findById(ticket.plan);
  const planCategory = await Category.findById(ticket.category);
  res.status(200).json({
    status: "success",
    data: { ticket, plan, planCategory },
  });
});
