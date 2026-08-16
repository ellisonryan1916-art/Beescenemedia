// Simple Express server for PayPal Orders API (create + capture).
// Usage: set PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_ENV (sandbox|live) in .env

const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors()); // In production, restrict origin
app.use(express.json());

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_ENV = (process.env.PAYPAL_ENV || 'sandbox').toLowerCase();

if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
  console.warn('PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET not set. Set them in .env from PayPal dashboard.');
}

const PAYPAL_BASE = PAYPAL_ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

// Obtain an OAuth2 access token using client credentials
async function getAccessToken() {
  const tokenUrl = `${PAYPAL_BASE}/v1/oauth2/token`;
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');

    const resp = await axios.post(tokenUrl, params.toString(), {
      auth: {
        username: PAYPAL_CLIENT_ID,
        password: PAYPAL_CLIENT_SECRET
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return resp.data.access_token;
  } catch (err) {
    console.error('Failed to fetch PayPal access token', err.response?.data || err.message);
    throw err;
  }
}

// Create order on PayPal
app.post('/api/create-order', async (req, res) => {
  const { packageName, packagePrice, parentName, athleteDetails, email } = req.body;

  if (!packagePrice || !packageName || !parentName || !athleteDetails || !email) {
    return res.status(400).json({ error: 'Missing required booking fields.' });
  }

  try {
    const accessToken = await getAccessToken();
    const orderResp = await axios.post(`${PAYPAL_BASE}/v2/checkout/orders`, {
      intent: 'CAPTURE',
      purchase_units: [{
        description: `${packageName} - Athlete: ${athleteDetails} (Contact: ${parentName})`,
        amount: {
          currency_code: 'USD',
          value: packagePrice.toString()
        }
      }],
      application_context: {
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW'
      }
    }, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    // Return the order ID to the client
    return res.json({ orderID: orderResp.data.id });
  } catch (err) {
    console.error('create-order error', err.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to create order' });
  }
});

// Capture order on PayPal
app.post('/api/capture-order', async (req, res) => {
  const { orderID } = req.body;
  if (!orderID) return res.status(400).json({ error: 'orderID is required' });

  try {
    const accessToken = await getAccessToken();
    const captureResp = await axios.post(`${PAYPAL_BASE}/v2/checkout/orders/${orderID}/capture`, {}, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    // Here you should record the capture result in your DB, send receipt email, etc.
    console.log('Payment captured:', captureResp.data);

    return res.json({ capture: captureResp.data });
  } catch (err) {
    console.error('capture-order error', err.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to capture order' });
  }
});

app.get('/health', (req, res) => res.send({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT} (${PAYPAL_ENV} mode)`);
});
