const express = require('express');
const cors    = require('cors');
const axios   = require('axios');

const app = express();
app.use(express.json());
app.use(cors());

// ── Environment variables (set in Railway Variables tab) ─────────────────────
const INTASEND_SECRET = process.env.INTASEND_SECRET_KEY || "ISSecretKey_live_4d30265d-b723-42f4-b947-1f851e410b80";
const INTASEND_PUBLIC = process.env.INTASEND_PUBLISHABLE_KEY || "ISPubKey_live_ac56c712-c55e-49e2-b3a1-764cec1e9a2e";
const CHALLENGE_TOKEN = process.env.INTASEND_CHALLENGE || "AffiliateSystemSecureToken2026!";

// ── In-memory transaction store ──────────────────────────────────────────────
const transactions = {};

// ── 1. Initiate IntaSend M-Pesa STK Push ─────────────────────────────────────
app.post('/api/pay', async (req, res) => {
    // 🛡️ Safe Extraction: Accept whatever names your frontend is using
    const username = req.body.username || req.body.name || "User";
    const phone    = req.body.phone || req.body.phoneNumber || req.body.mpesaNumber;
    const email    = req.body.email || `${String(username).toLowerCase().replace(/[^a-z0-9]/g, '')}@cashflow254.com`;

    if (!phone) {
        return res.status(400).json({ errorMessage: "Missing phone number field configuration." });
    }

    // Standardize phone layout format to 12 digits (2547...)
    let cleanPhone = phone.trim().replace(/\+/g, '');
    if (cleanPhone.startsWith('0')) {
        cleanPhone = '254' + cleanPhone.slice(1);
    }

    try {
        const response = await axios.post('https://api.intasend.com/api/v1/payment/mpesa-stk-push/', {
            public_key:   INTASEND_PUBLIC,
            amount:       "100", 
            phone_number: cleanPhone,
            email:        email,
            narrative:    "CASH-FLOW-254 Membership Activation"
        }, {
            headers: {
                'Authorization': `Bearer ${INTASEND_SECRET}`,
                'Content-Type':  'application/json'
            }
        });

        // Track and extract key value records from payload
        let trackingId = response.data.id;
        if (response.data.invoice && response.data.invoice.invoice_id) {
            trackingId = response.data.invoice.invoice_id;
        }
        
        if (trackingId) {
            transactions[trackingId] = { 
                status: "pending", 
                username, 
                phone: cleanPhone,
                email: email
            };
        }

        console.log(`[STK SENT]: Prompt delivered. Tracking ID: ${trackingId}`);

        // Return a clean 200 payload mapping directly to your HTML's CheckoutRequestID expectations
        return res.status(200).json({
            id: trackingId,
            CheckoutRequestID: trackingId
        });

    } catch (error) {
        console.error("IntaSend API Rejection Logs:", error.response?.data || error.message);
        
        // Return structured parameters even on failure to satisfy frontend validation loops
        return res.status(200).json({ 
            CheckoutRequestID: "ERROR_REJECTED",
            errorMessage: "Gateway parameters layout mismatch or connection rejected."
        });
    }
});

// ── 2. IntaSend Webhook Callback Receiver ────────────────────────────────────
app.post('/api/callback', (req, res) => {
    console.log("Callback received from IntaSend:", JSON.stringify(req.body));
    const payload = req.body;

    if (!payload || payload.challenge !== CHALLENGE_TOKEN) {
        console.error("🛑 Security Warning: Unauthorized webhook attempt blocked.");
        return res.status(401).send("Unauthorized Signature Tokens");
    }

    const invoice = payload.invoice;
    const transactionState = invoice ? invoice.state : payload.state;
    const checkoutId = invoice ? invoice.invoice_id : payload.id;

    if (!checkoutId) {
        return res.status(200).send("No identifier located");
    }

    if (transactionState === "COMPLETE") {
        transactions[checkoutId] = {
            ...transactions[checkoutId],
            status:     "success",
            resultDesc: "Payment cleared successfully",
            receipt:    invoice?.mpesa_reference || "INTASEND_REF",
            amount:     invoice?.value || "100",
            payerPhone: invoice?.customer?.phone_number || transactions[checkoutId]?.phone
        };
        console.log(`🚀 Membership active flag verified for checkoutId: ${checkoutId}`);
    } else if (transactionState === "FAILED") {
        transactions[checkoutId] = {
            ...transactions[checkoutId],
            status:     "failed",
            resultDesc: "Transaction declined or timed out"
        };
    }

    return res.status(200).send("Callback Processed Successfully");
});

// ── 3. Status Poll ───────────────────────────────────────────────────────────
app.get('/api/status/:checkoutId', (req, res) => {
    const record = transactions[req.params.checkoutId];
    if (!record) {
        return res.status(200).json({ status: "pending" });
    }
    return res.status(200).json(record);
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`CASH-FLOW-254 live gateway running on port ${PORT}`));
