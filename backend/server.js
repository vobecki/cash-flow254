const express = require('express');
const path = require('path');
const Intasend = require('intasend-node');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const intasend = new Intasend(
  process.env.INTASEND_PUBLISHABLE_KEY,
  process.env.INTASEND_SECRET_KEY,
  process.env.IS_TEST_MODE === 'true'
);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 1. FRONTEND STK TRIGGER ROUTE
app.post('/api/pay/mpesa', async (req, res) => {
  try {
    const { phoneNumber, amount, systemToken } = req.body;

    if (!systemToken || systemToken !== process.env.SYSTEM_CHALLENGE_TOKEN) {
      console.warn("Security Alert: Unauthorized payment trigger attempt blocked.");
      return res.status(403).json({ success: false, error: "Security Token Challenge Failed" });
    }

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
    console.error("Payment failed to initialize:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. AUTOMATED INTASEND WEBHOOK RECEIVER ROUTE
app.post('/api/webhook', (req, res) => {
  try {
    const payload = req.body;
    
    // Read the security challenge signature sent directly by IntaSend
    const incomingChallenge = payload.challenge;

    // Secure Verification Check against your environment rules
    if (!incomingChallenge || incomingChallenge !== process.env.INTASEND_WEBHOOK_CHALLENGE) {
      console.error("Security Alert: Rejecting unauthenticated webhook signature drop.");
      return res.status(401).json({ status: "Unauthorized" });
    }

    // Process the payment update once cleared by security
    console.log(`Webhook Event Verified: ${payload.state} for invoice ${payload.invoice_id}`);
    
    if (payload.state === 'COMPLETE') {
        console.log(`💰 Success! Processed KES ${payload.amount} entry into Cashflow254.`);
        // This is exactly where you write code to save the receipt logs to a file/database
    }

    // Always respond with a clean 200 HTTP status so IntaSend stops retrying the hook
    res.status(200).json({ status: "Success" });
  } catch (err) {
    console.error("Webhook processing error:", err.message);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(PORT, () => {
  console.log(`Cashflow254 running securely with Webhooks on port ${PORT}`);
});
