
const express = require('express');
const path = require('path');
const Intasend = require('intasend-node');

const app = express();
const PORT = process.env.PORT || 3000;

// Essential Middlewares to handle user form inputs
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// This reads the keys securely from your Railway Variables setup
const intasend = new Intasend({
  publishableKey: process.env.INTASEND_PUBLISHABLE_KEY,
  secretKey: process.env.INTASEND_SECRET_KEY,
  isTestMode: process.env.IS_TEST_MODE === 'true'
});

// Serve the clean frontend dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Live M-Pesa STK Push endpoint
app.post('/api/pay/mpesa', async (req, res) => {
  try {
    const { phoneNumber, amount } = req.body;

    // Clean up phone number format (Converts 07... or +254... to 254...)
    let cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '254' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('+')) {
      cleanPhone = cleanPhone.substring(1);
    }

    const collection = intasend.collection();
    const response = await collection.mpesaStkPush({
      first_name: 'Cashflow',
      last_name: 'User',
      email: 'payment@cashflow254.co.ke',
      host: 'https://cash-flow-254-production.up.railway.app',
      amount: parseFloat(amount),
      phone_number: cleanPhone,
      api_ref: `CF254-${Date.now()}`
    });

    res.status(200).json({ success: true, data: response });
  } catch (error) {
    console.error("Payment failed to initialize:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Cashflow254 running cleanly on port ${PORT}`);
});
