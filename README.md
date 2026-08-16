# BeeSceneMedia — PayPal Server Example

This branch adds an example Node/Express server that creates and captures PayPal orders securely (server-side), plus a client index.html wired to use the server endpoints.

Files added:
- server.js — Express API for /api/create-order and /api/capture-order
- package.json — dependencies and start script
- .env.example — environment variables for PayPal credentials
- index.html — client form and PayPal buttons configured to call the server

Quick start
1. Copy `.env.example` to `.env` and fill PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET (use sandbox for testing).
2. npm install
3. npm start
4. Serve `index.html` from the same origin as the server (or update server CORS). Open the page and test the flow.

Notes
- In production, lock down CORS, use HTTPS, and persist booking information (DB).
- Validate package prices server-side (map package identifiers to amounts) rather than trusting client-sent prices.
- Replace `YOUR_PUBLIC_CLIENT_ID` in `index.html` with your PayPal public client ID.
