import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { sendOrderAlert } from "../services/email.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, session, admin, payload } = await authenticate.webhook(request);

  if (!payload) {
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
  
  // Check if order exceeds threshold
  if (orderTotal > settings.orderThreshold) {
    try {
      // Get order details with line items
      const orderResponse = await admin.graphql(`
        query getOrder($id: ID!) {
          order(id: $id) {
            id
            name
            totalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            customer {
              firstName
              lastName
              email
            }
            lineItems(first: 3) {
              edges {
                node {
                  title
                  quantity
                  originalUnitPriceSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
          }
        }
      `, {
        variables: { id: order.id }
      });

      const orderData = await orderResponse.json();
      const orderDetails = orderData.data?.order;

      if (orderDetails && settings.emailRecipient) {
        await sendOrderAlert({
          to: settings.emailRecipient,
          order: orderDetails,
          threshold: settings.orderThreshold,
        });
      }
    } catch (error) {
      console.error("Error processing order alert:", error);
      return json({ success: false, error: "Failed to process order alert" }, { status: 500 });
    }
  }

  return json({ success: true });
};
