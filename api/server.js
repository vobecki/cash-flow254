const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// IntaSend Environment Variables Setup
const SECRET_KEY = process.env.INTASEND_SECRET_KEY;
const PUBLISHABLE_KEY = process.env.INTASEND_PUBLISHABLE_KEY;

// Base URL selection depending on your API Key environment
const getIntaSendBaseUrl = () => {
  if (PUBLISHABLE_KEY && PUBLISHABLE_KEY.includes('test')) {
    return 'https://sandbox.intasend.com';
  }
  return 'https://api.intasend.com';
};

// 🟢 Route: Triggers the M-Pesa STK Push
app.post('/api/stkpush', async (req, res) => {
  const { amount, phone_number } = req.body;

  if (!amount || !phone_number) {
    return res.status(400).json({ error: 'Amount and phone number are required' });
  }

  try {
    const baseUrl = getIntaSendBaseUrl();
    const response = await axios.post(
      `${baseUrl}/api/v1/payment/mpesa-stk-push/`,
      {
        amount: amount.toString(),
        phone_number: phone_number,
        api_ref: 'Cashflow254_Deposit',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SECRET_KEY}`
        }
      }
    );

    return res.status(200).json(response.data);
  } catch (error) {
    console.error('STK Push Error Details:', error.response ? error.response.data : error.message);
    return res.status(500).json({
      error: 'Failed to initiate STK push via IntaSend',
      details: error.response ? error.response.data : error.message
    });
  }
});

// 🔵 Route: Listens for Webhook Confirmations from IntaSend
app.post('/api/webhook', (req, res) => {
  const payload = req.body;
  console.log('Valid Webhook Activity Received:', payload);

  if (payload.state === 'COMPLETE') {
    console.log(`Verified Success: Payment of KES ${payload.amount} received via reference ${payload.api_ref}`);
    // Optional: Add operational code here to credit user profiles instantly
  }

  // Always respond with a 200 status code to notify IntaSend you received the payload
  res.status(200).json({ status: 'received' });
});

// Setup fallback port configurations for local sandbox verification
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server running locally on port ${PORT}`));
}

module.exports = app;