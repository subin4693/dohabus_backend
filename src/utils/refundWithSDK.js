const cybersourceRestApi = require("cybersource-rest-client");

const refundWithSDK = async (ticket, refundAmount) => {
  console.log("🚀 Initiating CyberSource refund via SDK...");
  console.log("🎫 Ticket:", ticket);
  console.log("💰 Refund Amount:", refundAmount);

  const configObject = {
    authenticationType: "http_signature",
    runEnvironment: "https://api.cybersource.com",
    merchantID: process.env.CYBERSOURCE_MERCHANT_ID,
    merchantKeyId: process.env.CYBERSOURCE_SHARED_API_KEY_ID,
    merchantSecretKey: process.env.CYBERSOURCE_SHARED_API_SECRET,
  };

  // Log ENV values (safely)
  console.log("🔐 ENVIRONMENT CONFIG:");
  console.log("🔑 CYBERSOURCE_MERCHANT_ID:", configObject.merchantID);
  console.log("🆔 CYBERSOURCE_SHARED_API_KEY_ID:", configObject.merchantKeyId);
  console.log(
    "🧬 CYBERSOURCE_SHARED_API_SECRET (first 10 chars):",
    configObject.merchantSecretKey?.slice(0, 10) + "..."
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
          console.log
