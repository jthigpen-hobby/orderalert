import nodemailer from "nodemailer";

interface OrderAlertData {
  to: string;
  order: {
    id: string;
    name: string;
    totalPriceSet: {
      shopMoney: {
        amount: string;
        currencyCode: string;
      };
    };
    customer: {
      firstName: string;
      lastName: string;
      email: string;
    } | null;
    lineItems: {
      edges: Array<{
        node: {
          title: string;
          quantity: number;
          originalUnitPriceSet: {
            shopMoney: {
              amount: string;
              currencyCode: string;
            };
          };
        };
      }>;
    };
  };
  threshold: number;
}

export async function sendOrderAlert({ to, order, threshold }: OrderAlertData) {
  // For development, we'll use a simple console log
  // In production, you'd configure a real email service like SendGrid, Mailgun, etc.
  
  const customerName = order.customer 
    ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
    : "Guest Customer";
  
  const orderTotal = parseFloat(order.totalPriceSet.shopMoney.amount);
  const currency = order.totalPriceSet.shopMoney.currencyCode;
  
  const topItems = order.lineItems.edges.slice(0, 3).map(edge => {
    const item = edge.node;
    const price = parseFloat(item.originalUnitPriceSet.shopMoney.amount);
    return `${item.title} (Qty: ${item.quantity}) - ${currency} ${price.toFixed(2)}`;
  }).join('\n');

  const emailContent = `
🚨 HIGH VALUE ORDER ALERT 🚨

Order Details:
- Order #: ${order.name}
- Customer: ${customerName}
- Order Total: ${currency} ${orderTotal.toFixed(2)}
- Threshold: ${currency} ${threshold.toFixed(2)}

Top 3 Items:
${topItems}

Order Link: https://${process.env.SHOPIFY_SHOP_DOMAIN || 'your-store'}.myshopify.com/admin/orders/${order.id}

This order exceeds your configured threshold of ${currency} ${threshold.toFixed(2)}.
  `.trim();

  // For now, we'll just log the email content
  // In production, you'd send this via your email service
  console.log("📧 ORDER ALERT EMAIL:");
  console.log(`To: ${to}`);
  console.log(emailContent);
  
  // TODO: Implement actual email sending
  // Example with nodemailer:
  /*
  const transporter = nodemailer.createTransporter({
    // Your email service configuration
  });
  
  await transporter.sendMail({
    from: 'alerts@yourdomain.com',
    to,
    subject: `🚨 High Value Order Alert - ${order.name}`,
    text: emailContent,
  });
  */

  return { success: true, message: "Order alert logged (email service not configured)" };
}
