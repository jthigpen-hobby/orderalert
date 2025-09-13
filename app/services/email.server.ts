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

  const subject = `🚨 High Value Order Alert - ${order.name}`;

  // Check if we're in production and have email service configured
  const isProduction = process.env.NODE_ENV === 'production';
  const hasEmailService = process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY;

  if (isProduction && hasEmailService) {
    try {
      // Try Resend first (simpler API)
      if (process.env.RESEND_API_KEY) {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Order Alerts <alerts@yourdomain.com>',
            to: [to],
            subject,
            text: emailContent,
          }),
        });

        if (response.ok) {
          console.log("📧 Email sent successfully via Resend");
          return { success: true, message: "Email sent successfully" };
        } else {
          console.error("❌ Resend email failed:", await response.text());
        }
      }

      // Fallback to SendGrid
      if (process.env.SENDGRID_API_KEY) {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: 'alerts@yourdomain.com', name: 'Order Alerts' },
            subject,
            content: [{ type: 'text/plain', value: emailContent }],
          }),
        });

        if (response.ok) {
          console.log("📧 Email sent successfully via SendGrid");
          return { success: true, message: "Email sent successfully" };
        } else {
          console.error("❌ SendGrid email failed:", await response.text());
        }
      }
    } catch (error) {
      console.error("❌ Email service error:", error);
    }
  }

  // Fallback to console logging (development or email service failure)
  console.log("📧 ORDER ALERT EMAIL:");
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(emailContent);
  
  return { 
    success: true, 
    message: isProduction 
      ? "Email service not configured - logged to console" 
      : "Development mode - logged to console" 
  };
}
