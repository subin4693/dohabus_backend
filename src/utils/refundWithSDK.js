const cybersourceRestApi = require("cybersource-rest-client");

const refundWithSDK = async (ticket, refundAmount) => {
  const configObject = {
    authenticationType: "http_signature",
    runEnvironment: "https://api.cybersource.com",
    merchantID: process.env.CYBERSOURCE_MERCHANT_ID,
    merchantKeyId: process.env.CYBERSOURCE_SHARED_API_KEY_ID,
    merchantSecretKey: process.env.CYBERSOURCE_SHARED_API_SECRET,
  };

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

  return new Promise((resolve, reject) => {
    refundApiInstance.refundPayment(
      request,
      ticket.cybersourceOrderId,
      async (error, data, response) => {
        if (error) {
          console.error("❌ CyberSource SDK Refund Error:", JSON.stringify(error));
          return reject(new Error("Refund failed: " + error.message));
        }

        console.log("✅ CyberSource SDK Refund Response:", data);

        if (data.status === "PENDING" || data.processorInformation?.responseCode === "100") {
          ticket.paymentStatus = "Refund Processing";
          ticket.refundTransactionId = data.id;
          await ticket.save();

          const refundRecord = await Refund.findOne({ ticketId: ticket._id });
          if (refundRecord) {
            refundRecord.status = "Processing";
            refundRecord.refundAmount = refundAmount;
            await refundRecord.save();
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
          return reject(new Error("Refund failed: " + errorMsg));
        }
      },
    );
  });
};

module.exports = refundWithSDK;
