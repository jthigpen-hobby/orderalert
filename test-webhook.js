// Simple test script to verify webhook endpoint
// Run with: node test-webhook.js

const testOrder = {
  id: "gid://shopify/Order/123456789",
  name: "#1001",
  total_price: "150.00",
  currency: "USD",
  customer: {
    first_name: "John",
    last_name: "Doe",
    email: "john.doe@example.com"
  },
  line_items: [
    {
      title: "Test Product 1",
      quantity: 2,
      price: "50.00"
    },
    {
      title: "Test Product 2", 
      quantity: 1,
      price: "50.00"
    }
  ]
};

console.log("🧪 Test Order Data:");
console.log(JSON.stringify(testOrder, null, 2));
console.log("\n📧 This would trigger an alert if order total > threshold");
console.log("💡 Check your app console for the email alert log");
