const express = require('express');
const path = require('path');
const Intasend = require('intasend-node');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Dynamic safe initialization fallback
const pubKey = process.env.INTASEND_PUBLISHABLE_KEY || '';
const secKey = process.env.INTASEND_SECRET_KEY || '';

// Bulletproof core wrapper object pattern mapping
const intasend = new Intasend(pubKey, secKey, false);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 1. STK TRIGGER ENDPOINT
app.post('/api/pay/mpesa', async (req, res) => {
  try {
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
      host: 'https://cash-flow254-production.up.railway.app',
      amount: parseFloat(amount),
      phone_number: cleanPhone,
      api_ref: `CF254-${Date.now()}`
    });

    res.status(200).json({ success: true, data: response });
  } catch (error) {
    console.error("SDK Core payment drop error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. CRITICAL SECURE AUTOMATED WEBHOOK LISTENER
app.post('/api/webhook', (req, res) => {
  try {
    const challengeHeader = req.headers['intasend-challenge'] || req.body.challenge;
    const challengeTarget = process.env.INTASEND_WEBHOOK_CHALLENGE;

    if (!challengeHeader || challengeHeader !== challengeTarget) {
      console.warn("Security Drop: Unauthorized webhook initialization mismatch.");
      return res.status(401).json({ error: "Challenge check failure validation dropped." });
    }

    const payload = req.body;
    console.log(`Verified Webhook hit: Action State -> ${payload.state}`);

    if (payload.state === 'COMPLETE') {
      console.log(`💰 Entry processing verified: KES ${payload.amount}`);
    }

    res.status(200).json({ status: "Success" });
  } catch (err) {
    console.error("Internal Webhook handling runtime breakdown:", err.message);
    res.status(500).send("Internal processing fault.");
  }
});

app.listen(PORT, () => {
  console.log(`Cashflow254 engine listening actively on Port ${PORT}`);
});
