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
  try {
    if (!twilioClient) {
      console.error("Twilio client not initialized. Check environment variables.");
      return {
        success: false,
        error: "SMS service not configured",
      };
    }

    if (!to) {
      return {
        success: false,
        error: "Recipient phone number is required",
      };
    }

    // Normalize phone number (remove any spaces, dashes, etc.)
    const normalizedPhone = to.replace(/\D/g, "");
    
    // Ensure phone number has country code
    const phoneWithCountryCode = normalizedPhone.startsWith("1") 
      ? `+${normalizedPhone}` 
      : `+1${normalizedPhone}`;

    const messageOptions: any = {
      body: message,
      to: phoneWithCountryCode,
    };

    // Use either messaging service SID or from phone number
    if (messagingServiceSid) {
      messageOptions.messagingServiceSid = messagingServiceSid;
    } else if (fromPhoneNumber) {
      messageOptions.from = fromPhoneNumber;
    } else {
      return {
        success: false,
        error: "No Twilio messaging service or phone number configured",
      };
    }

    const twilioMessage = await twilioClient.messages.create(messageOptions);

    return {
      success: true,
      messageSid: twilioMessage.sid,
    };
  } catch (error: any) {
    console.error("Error sending SMS:", error);
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
