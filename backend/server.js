const express = require('express');
const path = require('path');
const Intasend = require('intasend-node');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// FIXED: SDK instantiation requires direct parameters, not an object configuration
const intasend = new Intasend(
  process.env.INTASEND_PUBLISHABLE_KEY,
  process.env.INTASEND_SECRET_KEY,
  process.env.IS_TEST_MODE === 'true'
);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Secure API endpoint enforcing the system token challenge
app.post('/api/pay/mpesa', async (req, res) => {
  try {
    const { phoneNumber, amount, systemToken } = req.body;

    // Enforce Affiliate System Token validation check
    if (systemToken !== "AffiliateSystemSecureToken2026") {
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

app.listen(PORT, () => {
  console.log(`Cashflow254 running securely on port ${PORT}`);
});
