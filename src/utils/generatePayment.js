const { v4: uuidv4 } = require('uuid');
const cryptojs = require('crypto-js');
require('dotenv').config();
const paymentGatewayDetails = {
    sandboxURL: "https://skipcashtest.azurewebsites.net",
    productionURL: "https://api.skipcash.app",
    secretKey: process.env.SKIP_CASH_KEY_SECRET,
    keyId: process.env.SKIP_CASH_KEY_ID,
    clientId: process.env.SKIP_CASH_CLIENT_ID,
    
};
// console.log("Client id",paymentGatewayDetails.clientId,paymentGatewayDetails.keyId,paymentGatewayDetails.secretKey)
const generatePaymentRequestSKIP = async (paymentDetails) => {
    const { default: fetch } = await import('node-fetch');
    const combinedData = `Uid=${paymentDetails.Uid},KeyId=${paymentDetails.KeyId},Amount=${paymentDetails.Amount},FirstName=${paymentDetails.FirstName},LastName=${paymentDetails.LastName},Phone=${paymentDetails.Phone},Email=${paymentDetails.Email},TransactionId=${paymentDetails.TransactionId},Custom1=${paymentDetails.Custom1}`;
    const combinedDataHash = cryptojs.HmacSHA256(combinedData, paymentGatewayDetails.secretKey);
    const hashInBase64 = cryptojs.enc.Base64.stringify(combinedDataHash);
    try {
  console.log("Combined Dat ais",combinedData);
  console.log("Hashed Combined Data",combinedDataHash);
        console.log("Generated Signature:", hashInBase64);
        console.log("Request Body:", JSON.stringify(paymentDetails));

        const url = `${paymentGatewayDetails.productionURL}/api/v1/payments`;
        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: hashInBase64,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(paymentDetails),
        });

        if (!response.ok) {
            const responseBody = await response.text();
            console.error(`Error response status: ${response.status}`);
            console.error(`Error response body: ${responseBody}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const json = await response.json();
        return json.resultObj;
    } catch (err) {
        console.error("Error generating payment request:", err.message);
        throw err;
    }
};

module.exports = generatePaymentRequestSKIP;
