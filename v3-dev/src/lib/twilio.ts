import twilio from "twilio";

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
const fromPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let twilioClient: ReturnType<typeof twilio> | null = null;

if (accountSid && authToken) {
  twilioClient = twilio(accountSid, authToken);
}

export interface SendSMSParams {
  to: string;
  message: string;
}

/**
 * Send an SMS message using Twilio
 * @param params - The SMS parameters
 * @returns Promise with the message SID or error
 */
export async function sendSMS({ to, message }: SendSMSParams): Promise<{
  success: boolean;
  messageSid?: string;
  error?: string;
}> {
  console.log("📱 [Twilio] Starting SMS send process...");
  console.log("📱 [Twilio] Recipient:", to);
  console.log("📱 [Twilio] Message:", message);
  
  try {
    if (!twilioClient) {
      console.error("❌ [Twilio] Client not initialized. Check environment variables.");
      console.error("❌ [Twilio] TWILIO_ACCOUNT_SID present:", !!accountSid);
      console.error("❌ [Twilio] TWILIO_AUTH_TOKEN present:", !!authToken);
      return {
        success: false,
        error: "SMS service not configured",
      };
    }

    console.log("✅ [Twilio] Client initialized successfully");

    if (!to) {
      console.error("❌ [Twilio] No recipient phone number provided");
      return {
        success: false,
        error: "Recipient phone number is required",
      };
    }

    // Normalize phone number (remove any spaces, dashes, etc.)
    const normalizedPhone = to.replace(/\D/g, "");
    console.log("📱 [Twilio] Normalized phone:", normalizedPhone);
    
    // Ensure phone number has country code
    const phoneWithCountryCode = normalizedPhone.startsWith("1") 
      ? `+${normalizedPhone}` 
      : `+1${normalizedPhone}`;
    
    console.log("📱 [Twilio] Phone with country code:", phoneWithCountryCode);

    const messageOptions: any = {
      body: message,
      to: phoneWithCountryCode,
    };

    // Use either messaging service SID or from phone number
    if (messagingServiceSid) {
      console.log("✅ [Twilio] Using messaging service SID:", messagingServiceSid);
      messageOptions.messagingServiceSid = messagingServiceSid;
    } else if (fromPhoneNumber) {
      console.log("✅ [Twilio] Using from phone number:", fromPhoneNumber);
      messageOptions.from = fromPhoneNumber;
    } else {
      console.error("❌ [Twilio] No messaging service SID or from phone number configured");
      return {
        success: false,
        error: "No Twilio messaging service or phone number configured",
      };
    }

    console.log("📱 [Twilio] Sending message with options:", JSON.stringify(messageOptions, null, 2));
    const twilioMessage = await twilioClient.messages.create(messageOptions);
    
    console.log("✅ [Twilio] SMS sent successfully!");
    console.log("✅ [Twilio] Message SID:", twilioMessage.sid);
    console.log("✅ [Twilio] Message status:", twilioMessage.status);

    return {
      success: true,
      messageSid: twilioMessage.sid,
    };
  } catch (error: any) {
    console.error("❌ [Twilio] Error sending SMS:", error);
    console.error("❌ [Twilio] Error code:", error.code);
    console.error("❌ [Twilio] Error message:", error.message);
    console.error("❌ [Twilio] Error details:", JSON.stringify(error, null, 2));
    return {
      success: false,
      error: error.message || "Failed to send SMS",
    };
  }
}

/**
 * Send SMS notifications to multiple recipients
 * @param recipients - Array of phone numbers
 * @param message - The message to send
 * @returns Promise with results for each recipient
 */
export async function sendBulkSMS(
  recipients: string[],
  message: string
): Promise<{
  sent: number;
  failed: number;
  results: Array<{ phone: string; success: boolean; error?: string }>;
}> {
  console.log("📱 [Twilio] Starting bulk SMS send...");
  console.log("📱 [Twilio] Number of recipients:", recipients.length);
  console.log("📱 [Twilio] Recipients:", recipients);
  
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

  console.log("📱 [Twilio] Bulk SMS complete:");
  console.log("✅ [Twilio] Sent:", sent);
  console.log("❌ [Twilio] Failed:", failed);
  console.log("📱 [Twilio] Detailed results:", JSON.stringify(results, null, 2));

  return { sent, failed, results };
}

/**
 * Format an event notification message
 * @param params - Event details
 * @returns Formatted message string
 */
export function formatEventNotification({
  eventTitle,
  amount,
  clubName,
  paymentLink,
}: {
  eventTitle: string;
  amount: number;
  clubName: string;
  paymentLink: string;
}): string {
  const amountInDollars = (amount / 100).toFixed(2);
  return `${clubName}: You've been assigned to "${eventTitle}" ($${amountInDollars}). Pay here: ${paymentLink}`;
}
