import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  TextField,
  Checkbox,
  Banner,
  InlineStack,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  // Get or create app settings for this shop
  let settings = await db.appSettings.findUnique({
    where: { shop: session.shop },
  });

  if (!settings) {
    settings = await db.appSettings.create({
      data: {
        shop: session.shop,
        orderThreshold: 100.0,
        emailRecipient: "",
        isEnabled: true,
      },
    });
  }

  return json({ settings });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const orderThreshold = parseFloat(formData.get("orderThreshold") as string);
  const emailRecipient = formData.get("emailRecipient") as string;
  const isEnabled = formData.get("isEnabled") === "on";

  // Update or create app settings
  await db.appSettings.upsert({
    where: { shop: session.shop },
    update: {
      orderThreshold,
      emailRecipient,
      isEnabled,
    },
    create: {
      shop: session.shop,
      orderThreshold,
      emailRecipient,
      isEnabled,
    },
  });

  return redirect("/app");
};

export default function Index() {
  const { settings } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  
  const [orderThreshold, setOrderThreshold] = useState(settings.orderThreshold.toString());
  const [emailRecipient, setEmailRecipient] = useState(settings.emailRecipient);
  const [isEnabled, setIsEnabled] = useState(settings.isEnabled);
  
  const isSubmitting = navigation.state === "submitting";

  return (
    <Page>
      <TitleBar title="Order Alerts Settings" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  Order Alert Configuration
                </Text>
                <Text variant="bodyMd" as="p">
                  Configure your order alert settings to receive notifications when orders exceed your threshold.
                </Text>
              </BlockStack>

              {actionData && (
                <Banner tone="success">
                  Settings saved successfully!
                </Banner>
              )}

              <form method="post">
                <BlockStack gap="400">
                  <Checkbox
                    label="Enable order alerts"
                    checked={isEnabled}
                    onChange={setIsEnabled}
                    name="isEnabled"
                  />

                  <TextField
                    label="Order threshold ($)"
                    type="number"
                    step={0.01}
                    value={orderThreshold}
                    onChange={setOrderThreshold}
                    name="orderThreshold"
                    helpText="Orders above this amount will trigger an alert"
                    disabled={!isEnabled}
                    autoComplete="off"
                  />

                  <TextField
                    label="Email recipient"
                    type="email"
                    value={emailRecipient}
                    onChange={setEmailRecipient}
                    name="emailRecipient"
                    helpText="Email address to receive order alerts"
                    disabled={!isEnabled}
                    autoComplete="email"
                  />

                  <InlineStack gap="300">
                    <Button
                      variant="primary"
                      submit
                      loading={isSubmitting}
                      disabled={!isEnabled && (!emailRecipient || !orderThreshold)}
                    >
                      Save Settings
                    </Button>
                  </InlineStack>
                </BlockStack>
              </form>
            </BlockStack>
          </Card>
        </Layout.Section>
        
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="200">
              <Text as="h2" variant="headingMd">
                How it works
              </Text>
              <BlockStack gap="200">
                <Text variant="bodyMd" as="p">
                  When a new order is created in your store, the app will:
                </Text>
                <BlockStack gap="100">
                  <Text variant="bodyMd" as="p">
                    1. Check if the order total exceeds your threshold
                  </Text>
                  <Text variant="bodyMd" as="p">
                    2. Send an email alert with order details
                  </Text>
                  <Text variant="bodyMd" as="p">
                    3. Include order number, customer name, total, and top 3 items
                  </Text>
                </BlockStack>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
