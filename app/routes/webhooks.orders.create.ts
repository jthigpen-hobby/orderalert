import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { sendOrderAlert } from "../services/email.server";

console.log("📁 Webhook file loaded: webhooks.orders.create.tsx");

export const action = async ({ request }: ActionFunctionArgs) => {
  console.log("🔔 Webhook received: orders/create");
  
  let topic, shop, session, admin, payload;
  
  try {
    const authResult = await authenticate.webhook(request);
    topic = authResult.topic;
    shop = authResult.shop;
    session = authResult.session;
    admin = authResult.admin;
    payload = authResult.payload;
    console.log("🔔 Webhook authenticated:", { topic, shop, session: !!session });
  } catch (error) {
    console.error("❌ Webhook authentication failed:", error);
    return json({ success: false, error: "Authentication failed" }, { status: 401 });
  }

  if (!payload) {
    console.log("❌ No payload found in webhook");
    throw new Response("Request body not found", { status: 400 });
  }

  // Get app settings for this shop
  const settings = await db.appSettings.findUnique({
    where: { shop },
  });

  if (!settings || !settings.isEnabled) {
    return json({ success: true, message: "Alerts disabled or settings not found" });
  }

  // Parse the order data
  const order = payload as any;
  const orderTotal = parseFloat(order.total_price || "0");
  
  console.log("🔔 Order processing:", { 
    orderId: order.id, 
    orderTotal, 
    threshold: settings.orderThreshold,
    exceedsThreshold: orderTotal > settings.orderThreshold 
  });
  
  // Check if order exceeds threshold
  if (orderTotal > settings.orderThreshold) {
    console.log("🚨 High value order detected! Processing alert...");
    
    if (settings.emailRecipient) {
      // Use data from webhook payload instead of making additional GraphQL call
      const orderDetails = {
        id: order.id,
        name: order.name || order.order_number || "Unknown",
        totalPriceSet: {
          shopMoney: {
            amount: order.total_price,
            currencyCode: order.currency || "USD"
          }
        },
        lineItems: {
          edges: (order.line_items || []).slice(0, 3).map((item: any) => ({
            node: {
              title: item.title || item.name || "Unknown Item",
              quantity: item.quantity || 1,
              originalUnitPriceSet: {
                shopMoney: {
                  amount: item.price || "0.00",
                  currencyCode: order.currency || "USD"
                }
              }
            }
          }))
        },
        customer: null // No customer data to avoid protected data requirements
      };

      await sendOrderAlert({
        to: settings.emailRecipient,
        order: orderDetails,
        threshold: settings.orderThreshold,
      });
    }
  }

  return json({ success: true });
};
