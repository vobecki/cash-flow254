const express = require('express');
const path = require('path');
const Intasend = require('intasend-node');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Dynamic absolute key fallback binding
const pubKey = process.env.INTASEND_PUBLISHABLE_KEY || '';
const secKey = process.env.INTASEND_SECRET_KEY || '';

let intasend;
try {
  // Correct IntaSend Node SDK initiation matching the strict signature parameters
  intasend = new Intasend(pubKey, secKey, false);
  console.log("✅ IntaSend wrapper initialized successfully.");
} catch (e) {
  console.error("❌ Fatal: SDK Initialization crashed:", e.message);
}

// Serves your frontend interface safely from the same folder context
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html')); 
});


// M-PESA STK SUBMISSION BACKEND
app.post('/api/pay/mpesa', async (req, res) => {
  try {
    if (!intasend) {
      return res.status(500).json({ success: false, error: "Intasend SDK is not initialized." });
    }

    const { phoneNumber, amount } = req.body;

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
      host: 'https://railway.app',
      amount: parseFloat(amount),
      phone_number: cleanPhone,
      api_ref: `CF254-${Date.now()}`
    });

    res.status(200).json({ success: true, data: response });
  } catch (error) {
    console.error("Payment deployment routing error triggered:", error);
    res.status(500).json({ success: false, error: error.message || "IntaSend Rejected Request" });
  }
});

// SECURE BACKEND WEBHOOK LISTENER
app.post('/api/webhook', (req, res) => {
  try {
    const challengeHeader = req.headers['intasend-challenge'] || req.body.challenge;
    const challengeTarget = process.env.INTASEND_WEBHOOK_CHALLENGE;

    if (!challengeHeader || challengeHeader !== challengeTarget) {
      return res.status(401).json({ error: "Challenge mismatch alert block." });
    }

    const payload = req.body;
    console.log(`Webhook connection state verified: ${payload.state}`);
    res.status(200).json({ status: "Success" });
  } catch (err) {
    res.status(500).send("Processing breakdown.");
  }
});

app.listen(PORT, () => {
  console.log(`Cashflow254 structural cluster live on Port ${PORT}`);
});
