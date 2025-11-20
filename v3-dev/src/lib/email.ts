/**
 * Email service for sending transactional emails
 * Uses Resend API (https://resend.com)
 * 
 * Environment variables:
 * - RESEND_API_KEY: Resend API key
 * - EMAIL_FROM: Default sender email (e.g., "Tally <noreply@tally.app>")
 */

const RESEND_API_URL = "https://api.resend.com/emails";

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

/**
 * Send an email using Resend API
 */
export async function sendEmail({
  to,
  subject,
  html,
  from,
  replyTo,
}: SendEmailParams): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  console.log("📧 [Email] Starting email send process...");
  console.log("📧 [Email] Recipient(s):", to);
  console.log("📧 [Email] Subject:", subject);

  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("❌ [Email] RESEND_API_KEY not configured");
      return {
        success: false,
        error: "Email service not configured",
      };
    }

    const fromEmail = from || process.env.EMAIL_FROM || "noreply@tally.app";

    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        reply_to: replyTo,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ [Email] Failed to send email:", data);
      return {
        success: false,
        error: data.message || "Failed to send email",
      };
    }

    console.log("✅ [Email] Email sent successfully!");
    console.log("✅ [Email] Message ID:", data.id);

    return {
      success: true,
      messageId: data.id,
    };
  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ [Email] Error sending email:", err);
    return {
      success: false,
      error: err.message || "Failed to send email",
    };
  }
}

/**
 * Send payout initiated notification email
 */
export async function sendPayoutInitiatedEmail({
  to,
  recipientName,
  amount,
  platformFee,
  netAmount,
  payoutId,
  clubName,
}: {
  to: string;
  recipientName: string;
  amount: number;
  platformFee: number;
  netAmount: number;
  payoutId: string;
  clubName: string;
}) {
  const subject = `Payout Initiated - $${netAmount.toFixed(2)} to ${recipientName}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h1 style="color: #2563eb; margin: 0 0 10px 0; font-size: 24px;">Payout Initiated ✓</h1>
          <p style="color: #6b7280; margin: 0; font-size: 14px;">Your payout has been successfully initiated</p>
        </div>
        
        <div style="background-color: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #374151; margin: 0 0 15px 0; font-size: 18px;">Payout Details</h2>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Recipient</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; font-size: 14px;">${recipientName}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Club</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; font-size: 14px;">${clubName}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Requested Amount</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; font-size: 14px;">$${amount.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Platform Fee (5.5%)</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right; color: #ef4444; font-weight: 600; font-size: 14px;">-$${platformFee.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 15px 0 10px 0; color: #374151; font-size: 16px; font-weight: 600;">Net Payout Amount</td>
              <td style="padding: 15px 0 10px 0; text-align: right; color: #16a34a; font-weight: 700; font-size: 20px;">$${netAmount.toFixed(2)}</td>
            </tr>
          </table>
        </div>
        
        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 14px; color: #1e40af;">
            <strong>Payout ID:</strong> ${payoutId}
          </p>
          <p style="margin: 10px 0 0 0; font-size: 14px; color: #1e40af;">
            The funds are being processed by Stripe and should arrive in the recipient's bank account within minutes to a few hours.
          </p>
        </div>
        
        <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 13px; color: #92400e;">
            <strong>Note:</strong> You'll receive another notification when the payout settles in the recipient's bank account.
          </p>
        </div>
        
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px;">
          <p style="margin: 0;">Tally - Club Payment Management</p>
          <p style="margin: 5px 0 0 0;">This is an automated message, please do not reply.</p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to,
    subject,
    html,
  });
}

/**
 * Send payout settled notification email
 */
export async function sendPayoutSettledEmail({
  to,
  recipientName,
  amount,
  payoutId,
  arrivalDate,
  clubName,
}: {
  to: string;
  recipientName: string;
  amount: number;
  payoutId: string;
  arrivalDate: string;
  clubName: string;
}) {
  const subject = `Payout Completed - $${amount.toFixed(2)} to ${recipientName}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h1 style="color: #16a34a; margin: 0 0 10px 0; font-size: 24px;">💰 Payout Completed!</h1>
          <p style="color: #6b7280; margin: 0; font-size: 14px;">The funds have been successfully transferred</p>
        </div>
        
        <div style="background-color: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #374151; margin: 0 0 15px 0; font-size: 18px;">Transfer Details</h2>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Recipient</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; font-size: 14px;">${recipientName}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Club</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; font-size: 14px;">${clubName}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Amount Paid Out</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right; color: #16a34a; font-weight: 700; font-size: 20px;">$${amount.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Settlement Date</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; font-size: 14px;">${new Date(arrivalDate).toLocaleDateString()}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Payout ID</td>
              <td style="padding: 10px 0; text-align: right; font-weight: 600; font-size: 12px; color: #9ca3af;">${payoutId}</td>
            </tr>
          </table>
        </div>
        
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 14px; color: #15803d;">
            ✓ The payout has been successfully deposited into ${recipientName}'s bank account.
          </p>
        </div>
        
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px;">
          <p style="margin: 0;">Tally - Club Payment Management</p>
          <p style="margin: 5px 0 0 0;">This is an automated message, please do not reply.</p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to,
    subject,
    html,
  });
}
