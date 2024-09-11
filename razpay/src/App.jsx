import { useState } from "react";
import axios from "axios";

function App() {

  const Razorpay_Key = import.meta.env.RAZORPAY_KEYID;
  // State to manage the amount to be paid
  const [amount, setAmount] = useState(250);

  // State to manage order details after payment verification
  const [order, setOrder] = useState({});

  // Function to initialize the payment process with Razorpay
  function initPayment(data) {
    // Options to configure the Razorpay payment gateway
    const options = {
      key: Razorpay_Key, // Your Razorpay API key
      amount: data.amount, // Amount to be charged (in the smallest currency unit, e.g., paise for INR)
      currency: data.currency, // Currency for the payment
      description: "Test transaction", // Description for the payment
      order_id: data.id, // Order ID received from the server
      handler: async (response) => {
        // Callback function to handle payment response from Razorpay
        try {
          // Send the payment details to the server for verification
          const { data } = await axios.post("http://localhost:3000/verify", {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });

          // Update order state with the verified order details
          setOrder(data.order);
        } catch (error) {
          // Log error if payment verification fails
          console.error("Payment verification error:", error);
        }
      },
      prefill: {
        name: "Your Name", // Pre-filled name in the payment form
        email: "your.email@example.com", // Pre-filled email in the payment form
        contact: "9999999999", // Pre-filled contact number in the payment form
      },
      theme: {
        color: "#3399cc", // Theme color for the payment form
      },
    };

    // Create a new Razorpay instance with the provided options
    const rzp1 = new window.Razorpay(options);

    // Open the Razorpay payment form
    rzp1.open();
  }

  // Function to handle the payment process
  const handlePayment = async () => {
    try {
      // Request to create a new order from the server
      const response = await axios.post("http://localhost:3000/orders", {
        amount,
      });

      // Extract order data from the server response
      const data = response.data;

      // Initialize payment process with the received order data
      initPayment(data.message);
    } catch (error) {
      // Log error if order creation fails
      console.error("Order creation error:", error);
    }
  };

  return (
    <>
      <h4>Price: {amount}</h4>
      <button onClick={handlePayment}>Pay Now</button>
      <p>Amount : {order.amount}</p>
    </>
  );
}

export default App;
