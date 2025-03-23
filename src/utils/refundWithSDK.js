const cybersourceRestApi = require("cybersource-rest-client");

const refundWithSDK = async (ticket, refundAmount) => {
  console.log("🚀 Initiating CyberSource refund via SDK...");
  console.log("🎫 Ticket:", ticket);
  console.log("💰 Refund Amount:", refundAmount);
  const configObject = new cybersourceRestApi.Configuration({
    authenticationType: "http_signature",
    runEnvironment: "https://api.cybersource.com",
    merchantID: process.env.CYBERSOURCE_MERCHANT_ID,
    merchantKeyId: process.env.CYBERSOURCE_SHARED_API_KEY_ID,
    merchantSecretKey: process.env.CYBERSOURCE_SHARED_API_SECRET,
  });

  // Log ENV values (safely)
  console.log("🔐 ENVIRONMENT CONFIG:");
  console.log("🔑 CYBERSOURCE_MERCHANT_ID:", configObject.merchantID);
  console.log("🆔 CYBERSOURCE_SHARED_API_KEY_ID:", configObject.merchantKeyId);
  console.log(
    "🧬 CYBERSOURCE_SHARED_API_SECRET (first 10 chars):",
    configObject.merchantSecretKey?.slice(0, 10) + "...",
  );

  const apiClient = new cybersourceRestApi.ApiClient();
  const refundApiInstance = new cybersourceRestApi.RefundApi(configObject, apiClient);
  const request = new cybersourceRestApi.RefundPaymentRequest();

  request.clientReferenceInformation = {
    code: ticket.transactionId,
  };

  request.orderInformation = {
    amountDetails: {
      totalAmount: Number(refundAmount).toFixed(2),
      currency: "QAR",
    },
  };

  console.log("📦 Refund Request Payload:", request);

  return new Promise((resolve, reject) => {
    refundApiInstance.refundPayment(
      request,
      ticket.cybersourceOrderId,
      async (error, data, response) => {
        console.log("📨 CyberSource Refund Request Sent");
        console.log("🔄 Refund Order ID:", ticket.cybersourceOrderId);

        if (error) {
          console.error("❌ CyberSource SDK Refund Error:", JSON.stringify(error, null, 2));
          return reject(new Error("Refund failed: " + error.message));
        }

        console.log("✅ CyberSource SDK Refund Response Data:", JSON.stringify(data, null, 2));
        console.log("📥 CyberSource SDK Full Response:", JSON.stringify(response, null, 2));

        if (data.status === "PENDING" || data.processorInformation?.responseCode === "100") {
          console.log("🟢 Refund accepted and processing...");
          ticket.paymentStatus = "Refund Processing";
          ticket.refundTransactionId = data.id;
          await ticket.save();
          console.log("📝 Ticket updated with refund transaction ID:", data.id);

          const refundRecord = await Refund.findOne({ ticketId: ticket._id });
          if (refundRecord) {
            refundRecord.status = "Processing";
            refundRecord.refundAmount = refundAmount;
            await refundRecord.save();
            console.log("🗃️ Refund record updated in DB.");
          } else {
            console.warn("⚠️ No existing refund record found for ticket:", ticket._id);
          }

          return resolve(data);
        } else {
          const code = data.processorInformation?.responseCode;
          let errorMsg = "";
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

          console.warn("⚠️ Refund rejected by CyberSource:", errorMsg);
          return reject(new Error("Refund failed: " + errorMsg));
        }
      },
    );
  });
};

module.exports = refundWithSDK;
