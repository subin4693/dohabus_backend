const axios = require('axios');
const crypto = require('crypto');

const merchantId = process.env.MERCHANT_ID;
const apiPassword = process.env.MAPI_PASSWORD;
const gatewayUrl = `https://test-gateway.mastercard.com/api/rest/version/57/merchant/${merchantId}`;
console.log('Merchant ID:', merchantId);
console.log('API Password:', apiPassword);

// Helper function for Basic Auth
const getBasicAuthHeader = () => {
  return `Basic ${Buffer.from(`merchant.${merchantId}:${apiPassword}`).toString('base64')}`;
};

exports.createSession = async (req, res) => {
  try {
    const response = await axios.post(`${gatewayUrl}/session`, {}, {
      headers: { 'Authorization': getBasicAuthHeader() }
    });
    
    if (response.data && response.data.session && response.data.session.id) {
      res.json({ sessionId: response.data.session.id });
    } else {
      throw new Error('Invalid response structure from MPGS API');
    }
  } catch (error) {
    console.log("Err from ayet",error)
    console.error('Error creating session:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to create session' });
  }
};

exports.initiateAuthentication = async (req, res) => {
  try {
    const { sessionId, orderDetails } = req.body;
    const orderId = `order-${Date.now()}`;
    const transactionId = `trans-${Date.now()}`;

    const response = await axios.put(`${gatewayUrl}/order/${orderId}/transaction/${transactionId}`, {
      apiOperation: "INITIATE_AUTHENTICATION",
      session: { id: sessionId },
      authentication: {
        channel: "PAYER_BROWSER",
        purpose: "PAYMENT_TRANSACTION"
      },
      order: {
        amount: orderDetails.amount,
        currency: orderDetails.currency
      },
      device: {
        browserDetails: {
          javaEnabled: true,
          language: "en-US",
          screenHeight: 640,
          screenWidth: 480,
          timeZone: 273,
          colorDepth: 24,
          acceptHeaders: "application/json",
          "3DSecureChallengeWindowSize": "FULL_SCREEN"
        },
        browser: "MOZILLA",
        ipAddress: req.ip
      }
    }, {
      headers: { 'Authorization': getBasicAuthHeader() }
    });
    
    res.json({ ...response.data, orderId, transactionId });
  } catch (error) {
    console.error('Error initiating authentication:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to initiate authentication' });
  }
};

exports.authenticatePayer = async (req, res) => {
  try {
    const { sessionId, orderId, transactionId } = req.body;
    const response = await axios.put(`${gatewayUrl}/order/${orderId}/transaction/${transactionId}`, {
      apiOperation: "AUTHENTICATE_PAYER",
      session: { id: sessionId },
      authentication: {
        redirectResponseUrl: `${process.env.FRONTEND_URL}/auth-result`
      }
    }, {
      headers: { 'Authorization': getBasicAuthHeader() }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error authenticating payer:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to authenticate payer' });
  }
};

exports.processPayment = async (req, res) => {
  try {
    const { sessionId, orderId, transactionId } = req.body;
    const response = await axios.put(`${gatewayUrl}/order/${orderId}/transaction/${transactionId}`, {
      apiOperation: "PAY",
      session: { id: sessionId },
      authentication: {
        transactionId: transactionId
      }
    }, {
      headers: { 'Authorization': getBasicAuthHeader() }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error processing payment:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to process payment' });
  }
};