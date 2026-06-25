const express = require('express');
const path = require('path');
const Intasend = require('intasend-node');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// FIXED: Hardcoded 'false' so it strictly forces Live Production mode without needing a Railway variable
const intasend = new Intasend(
  process.env.INTASEND_PUBLISHABLE_KEY,
  process.env.INTASEND_SECRET_KEY,
  false 
);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

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
      host: 'https://railway.app',
      amount: parseFloat(amount),
      phone_number: cleanPhone,
      api_ref: `CF254-${Date.now()}`
    });

    res.status(200).json({ success: true, data: response });
  } catch (error) {
    console.error("Payment initialization failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/webhook', (req, res) => {
  try {
    const payload = req.body;
    console.log(`Webhook Received: ${payload.state}`);
    res.status(200).json({ status: "Success" });
  } catch (err) {
    res.status(500).send("Internal Error");
  }
});

app.listen(PORT, () => {
  console.log(`Cashflow254 running on port ${PORT}`);
});
