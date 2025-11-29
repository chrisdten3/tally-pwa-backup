import Surge from "@surgeapi/node";

// Environment variables
const apiKey = process.env.SURGE_API_KEY;
const surgeAccountId = process.env.SURGE_ACCOUNT_ID; // e.g. "acct_01kaqdvvqdfxcb1rs7pbdj9h2wl"
const fromPhoneNumber = process.env.SURGE_PHONE_NUMBER; // may be configured in Surge dashboard

// Initialize Surge client
let surgeClient: Surge | null = null;

if (apiKey) {
  // Per Surge docs
  // const client = new Surge({ apiKey: 'My API Key' });
  surgeClient = new Surge({ apiKey });
} else {
  console.warn("⚠️ [Surge] SURGE_API_KEY is not set; SMS will be disabled.");
}

export interface SendSMSParams {
  to: string;
  message: string;
}

/**
 * Send an SMS message using Surge
 */
export async function sendSMS({
  to,
  message,
}: SendSMSParams): Promise<{
  success: boolean;
  messageSid?: string;
  error?: string;
}> {
  console.log("📱 [Surge] Starting SMS send process...");
  console.log("📱 [Surge] Recipient:", to);
  console.log("📱 [Surge] Message:", message);

  try {
    if (!surgeClient) {
      console.error("❌ [Surge] Client not initialized");
      return { success: false, error: "SMS service not configured" };
    }

    if (!surgeAccountId) {
      console.error("❌ [Surge] Missing SURGE_ACCOUNT_ID");
      return { success: false, error: "Surge account ID not configured" };
    }

    if (!to) {
      console.error("❌ [Surge] Missing recipient phone");
      return { success: false, error: "Recipient phone number is required" };
    }

    if (!fromPhoneNumber) {
      // Not strictly required by Surge (they pick a default number),
      // but we log to make sure your env is consistent.
      console.warn("⚠️ [Surge] SURGE_PHONE_NUMBER not set; using account default number");
    }

    // Normalize phone number
    const normalizedPhone = to.replace(/\D/g, "");
    const phoneWithCountryCode = normalizedPhone.startsWith("1")
      ? `+${normalizedPhone}`
      : `+1${normalizedPhone}`;

    console.log("📱 [Surge] Normalized phone:", normalizedPhone);
    console.log("📱 [Surge] Phone w/ country code:", phoneWithCountryCode);
    console.log("📱 [Surge] From phone (env):", fromPhoneNumber);
    console.log("📱 [Surge] Account ID:", surgeAccountId);

    console.log("📱 [Surge] Sending message...");

    // IMPORTANT: match Surge's expected shape (conversation/contact)
    const response = await surgeClient.messages.create(surgeAccountId, {
      body: message,
      conversation: {
        contact: {
          phone_number: phoneWithCountryCode,
          // first_name / last_name are optional
        },
      },
      // If/when Surge exposes explicit from-number selection, you can add it here
      // e.g. phone_number_id or similar, but for now the account's routing rules apply.
    });

    console.log("✅ [Surge] SMS sent!");
    console.log("📨 [Surge] Message ID:", response.id);
    console.log("📨 [Surge] Raw response:", JSON.stringify(response, null, 2));

    return { success: true, messageSid: response.id };
  } catch (err) {
    const error = err as Error;

    // Surge error messages often include HTTP status and JSON body as a string
    console.error("❌ [Surge] Error sending SMS:", error);
    console.error("❌ [Surge] Error message:", error.message);

    return {
      success: false,
      error: error.message || "Failed to send SMS",
    };
  }
}

/**
 * Send SMS notifications to multiple recipients
 */
export async function sendBulkSMS(
  recipients: string[],
  message: string
): Promise<{
  sent: number;
  failed: number;
  results: Array<{ phone: string; success: boolean; error?: string }>;
}> {
  console.log("📱 [Surge] Starting bulk SMS send...");
  console.log("📱 [Surge] Recipients:", recipients);

  const results = await Promise.all(
    recipients.map(async (phone) => {
      const result = await sendSMS({ to: phone, message });
      return {
        phone,
        success: result.success,
        error: result.error,
      };
    })
  );

  const sent = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log("📱 [Surge] Bulk SMS finished");
  console.log("✅ [Surge] Sent:", sent);
  console.log("❌ [Surge] Failed:", failed);
  console.log("📱 [Surge] Detailed results:", JSON.stringify(results, null, 2));

  return { sent, failed, results };
}

/**
 * Format an event notification message
 */
export function formatEventNotification({
  eventTitle,
  amount,
  clubName,
  paymentLink,
}: {
  eventTitle: string;
  amount: number; // in cents
  clubName: string;
  paymentLink: string;
}): string {
  const amountInDollars = (amount / 100).toFixed(2);
  return `${clubName}: You've been assigned to "${eventTitle}" ($${amountInDollars}). Pay here: ${paymentLink}`;
}
