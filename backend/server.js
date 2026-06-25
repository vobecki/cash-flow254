const express = require('express');
const path = require('path');
const cors = require('cors');
const Intasend = require('intasend-node');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable Global CORS access so your GitHub Pages frontend is unblocked
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'intasend-challenge']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const pubKey = process.env.INTASEND_PUBLISHABLE_KEY || '';
const secKey = process.env.INTASEND_SECRET_KEY || '';

let intasend;
try {
  intasend = new Intasend(pubKey, secKey, false);
  console.log("✅ IntaSend SDK initialized successfully.");
} catch (e) {
  console.error("❌ Fatal: SDK Initialization crashed:", e.message);
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// FIXED: Cleaned and structured M-Pesa STK Push Route
app.post('/api/pay/mpesa', async (req, res) => {
  try {
    if (!intasend) {
      return res.status(500).json({ success: false, error: "Intasend SDK is not initialized." });
    }

    const { phoneNumber, amount } = req.body;

    // Clean up mobile digits cleanly to 254 format
    let cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '254' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('+')) {
      cleanPhone = cleanPhone.substring(1);
    }

    const collection = intasend.collection();
    
    // CORRECTED SDK SIGNATURE: Exact property parameter mapping
    const response = await collection.mpesaStkPush({
      phone_number: cleanPhone,
      amount: parseFloat(amount),
      email: "payment@cashflow254.co.ke",
      first_name: "Cashflow",
      last_name: "User",
      narrative: "Cashflow254 Deposit Link"
    });

    res.status(200).json({ success: true, data: response });
  } catch (error) {
    console.error("Safaricom API Drop Error:", error);
    res.status(500).json({ success: false, error: error.message || "STK Push Rejected By Provider" });
  }
});

// Secure Automated Webhook Gateway
app.post('/api/webhook', (req, res) => {
  try {
    const challengeHeader = req.headers['intasend-challenge'] || req.body.challenge;
    const challengeTarget = process.env.INTASEND_WEBHOOK_CHALLENGE;

    if (!challengeHeader || challengeHeader !== challengeTarget) {
      return res.status(401).json({ error: "Challenge mismatch validation dropped." });
    }

    const payload = req.body;
    console.log(`Webhook Event Verified: ${payload.state}`);
    res.status(200).json({ status: "Success" });
  } catch (err) {
    res.status(500).send("Processing error.");
  }
});

app.listen(PORT, () => {
  console.log(`Cashflow254 live container operating on Port ${PORT}`);
});
