import express from 'express';
import cors from 'cors';
import { configDotenv } from 'dotenv';
import Razorpay from 'razorpay';
import crypto from 'crypto';

// Load environment variables from .env file
configDotenv();

const app = express();
const PORT = process.env.PORT;

// CORS configuration to allow requests from specific origin and methods
const corsOptions = {
  origin: 'http://localhost:5173', // The allowed origin for CORS
  methods: 'GET, HEAD, POST, PUT, PATCH, DELETE', // Allowed HTTP methods
  credentials: true, // Allow cookies and credentials
  allowedHeaders: 'Content-Type, Authorization', // Allowed headers in the request
};

app.use(cors(corsOptions)); // Apply CORS configuration to all routes
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// In-memory store for orders
const orders = {};

// Route to create a new order
app.post('/orders', async (req, res) => {
  try {
    // Initialize Razorpay instance with API keys
    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEYID,
      key_secret: process.env.RAZORPAY_KEYSECRET,
    });

    // Options for the order, including amount, currency, and receipt ID
    const options = {
      amount: req.body.amount, // Amount should be in the smallest unit (e.g., paise for INR)
      currency: 'INR', // Currency for the order
      receipt: crypto.randomBytes(10).toString('hex'), // Random receipt ID
    };

    // Create the order with Razorpay
    instance.orders.create(options, (error, order) => {
      if (error) {
        console.log(error); // Log error if order creation fails
        return res.status(500).json({ error: 'internal error' }); // Respond with an internal server error
      }

      // Store the order details in memory
      orders[order.id] = order;

      // Respond with the created order details
      res.status(200).json({ message: order });
    });
  } catch (error) {
    console.log(error); // Log error if something goes wrong
    return res.status(500).json({ error: 'internal error' }); // Respond with an internal server error
  }
});

// Route to verify payment signature
app.post('/verify', async (req, res) => {
  try {
    // Extract values from the request body
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Create a string to verify the signature
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEYSECRET) // Use HMAC with SHA-256
      .update(sign.toString()) // Update with the concatenated order and payment ID
      .digest('hex'); // Get the hexadecimal digest

    // Compare the expected signature with the one received
    if (razorpay_signature === expectedSign) {
      // Retrieve the order details from memory
      const order = orders[razorpay_order_id];

      if (order) {
        // Respond with success and the order details if signature is valid
        return res.status(200).json({ message: 'Payment verified', order });
      } else {
        // Respond with an error if the order is not found
        return res.status(400).json({ error: 'Order not found' });
      }
    } else {
      // Respond with an error if the signature is invalid
      return res.status(400).json({ error: 'Invalid signature sent' });
    }
  } catch (error) {
    console.log(error); // Log error if something goes wrong
    return res.status(500).json({ error: 'internal error' }); // Respond with an internal server error
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Connected to http://localhost:${PORT}`); // Log the server URL once it starts
});
