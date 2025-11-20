# Payout Fee Structure & Notifications

This document describes the payout fee structure and notification system implemented for Stripe payouts.

## Overview

The platform now charges a **5.5% fee** on all payouts to cover Stripe's transaction costs and generate platform revenue:

- **Stripe's cost**: 2.9% + $0.30 per transaction for domestic card payments
- **Platform fee**: 5.5% on payout amount
- **Net platform profit**: ~2.6%

When a payout is initiated, the admin receives real-time notifications via SMS and email, and another notification is sent when the payout settles in the recipient's bank account.

## Fee Calculation Example

```
Requested Payout Amount: $100.00
Platform Fee (5.5%):     -$5.50
Net Payout to Recipient: $94.50
```

The full $100 is deducted from the club balance, but only $94.50 is sent to the recipient. The $5.50 platform fee is tracked separately in the ledger.

## Implementation Details

### 1. Payout API Route

**Location**: `/v3-dev/src/app/api/stripe/payout/route.ts`

**Key Features**:
- Calculates 5.5% platform fee automatically
- Deducts full amount from club balance
- Sends net amount (after fee) to recipient
- Creates two ledger entries:
  - One for the payout (negative amount)
  - One for the platform fee (revenue tracking)
- Sends immediate SMS/email notification to admin when payout is initiated

**Request Body**:
```typescript
{
  clubId: string;
  userId: string;      // Recipient user ID
  amount: number;      // Requested payout amount (includes fee)
  description?: string;
}
```

**Response**:
```typescript
{
  ok: true,
  payout: {
    id: string;
    stripePayoutId: string;
    requestedAmount: number;
    platformFee: number;
    netPayoutAmount: number;
    feePercentage: "5.5%";
    status: string;
    recipient: string;
    newClubBalance: number;
    notificationSent: boolean;
  }
}
```

### 2. Email Service

**Location**: `/v3-dev/src/lib/email.ts`

**Provider**: [Resend](https://resend.com) API

**Email Templates**:

1. **Payout Initiated** (`sendPayoutInitiatedEmail`)
   - Sent when payout is created
   - Shows breakdown: requested amount, platform fee, net payout
   - Includes payout ID for tracking

2. **Payout Settled** (`sendPayoutSettledEmail`)
   - Sent when funds arrive in recipient's bank account
   - Confirms successful transfer
   - Shows settlement date

**Environment Variables Required**:
```bash
RESEND_API_KEY=re_xxxxx              # Resend API key
EMAIL_FROM="Tally <noreply@tally.app>" # Sender email address
```

### 3. SMS Notifications

**Location**: `/v3-dev/src/lib/twilio.ts` (already exists)

**Provider**: Twilio

SMS notifications are sent at:
- Payout initiation
- Payout settlement
- Payout failure

**Environment Variables Required**:
```bash
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_MESSAGING_SERVICE_SID=MGxxxxx  # OR
TWILIO_PHONE_NUMBER=+1234567890
```

### 4. Webhook Handlers

**Location**: `/v3-dev/src/app/api/stripe/webhook/route.ts`

**New Event Handlers**:

1. **`payout.paid`**
   - Triggered when payout successfully settles in recipient's bank account
   - Updates payout status to "paid"
   - Sends SMS + email notification to admin
   - Typical arrival time: minutes to a few hours for instant payouts

2. **`payout.failed`**
   - Triggered when payout fails
   - Updates payout status to "failed"
   - Sends alert SMS to admin
   - Includes failure reason from Stripe

## Database Schema

### Payouts Table

The `payouts` table stores payout records:

```sql
CREATE TABLE payouts (
  id TEXT PRIMARY KEY,
  club_id UUID REFERENCES clubs(id),
  amount INTEGER,                    -- In cents (includes platform fee)
  currency TEXT DEFAULT 'USD',
  receiver TEXT,
  receiver_type TEXT,
  provider TEXT DEFAULT 'stripe',
  provider_batch_id TEXT,            -- Stripe payout ID
  status TEXT,
  created_at TIMESTAMP,
  raw JSONB,
  initiated_by UUID REFERENCES users(id),
  recipient_user_id UUID REFERENCES users(id)
);
```

### Ledgers Table

Two ledger entries are created per payout:

1. **Payout Entry** (type: `"payout"`)
   ```
   amount: -100 (negative, deducted from club)
   description: "Payout from Club to user@example.com (Platform fee: $5.50, Net payout: $94.50)"
   ```

2. **Platform Fee Entry** (type: `"platform_fee"`)
   ```
   amount: 5.50 (positive, revenue for platform)
   description: "Platform fee (5.5%) for payout payout_xxxxx"
   ```

## Setup Instructions

### 1. Install Resend (for email)

```bash
cd v3-dev
npm install resend
```

### 2. Configure Environment Variables

Add to your `.env.local`:

```bash
# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM="Tally <noreply@yourdomain.com>"

# SMS (Twilio - already configured)
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_MESSAGING_SERVICE_SID=MGxxxxx
```

### 3. Set Up Resend

1. Sign up at [resend.com](https://resend.com)
2. Verify your domain or use the test domain for development
3. Generate an API key
4. Add the API key to your environment variables

### 4. Configure Stripe Webhooks

In your Stripe Dashboard:

1. Go to **Developers** → **Webhooks**
2. Add endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Enable these events:
   - `checkout.session.completed` (already enabled)
   - **`payout.paid`** (new)
   - **`payout.failed`** (new)

### 5. Test Webhooks Locally

Use Stripe CLI for local testing:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook

# In another terminal, trigger test events:
stripe trigger payout.paid
stripe trigger payout.failed
```

## Usage Example

### Initiating a Payout

```typescript
const response = await fetch('/api/stripe/payout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    clubId: 'club_123',
    userId: 'user_456',
    amount: 100,  // $100
    description: 'Weekly payout',
  }),
});

const result = await response.json();
console.log(result);
// {
//   ok: true,
//   payout: {
//     requestedAmount: 100,
//     platformFee: 5.5,
//     netPayoutAmount: 94.5,
//     feePercentage: "5.5%",
//     ...
//   }
// }
```

### Admin Receives:

1. **Immediate SMS**:
   ```
   Payout initiated: $94.50 to John Doe. 
   Platform fee: $5.50 (5.5%). 
   Payout ID: po_xxxxx
   ```

2. **Immediate Email**:
   - Subject: "Payout Initiated - $94.50 to John Doe"
   - Formatted HTML email with breakdown

3. **Settlement SMS** (when payout.paid webhook fires):
   ```
   Payout completed: $94.50 successfully deposited 
   to John Doe's bank account. Payout ID: po_xxxxx
   ```

4. **Settlement Email**:
   - Subject: "Payout Completed - $94.50 to John Doe"
   - Confirmation with settlement date

## Revenue Tracking

Platform fees are tracked in the `ledgers` table with `type = "platform_fee"`. To calculate total platform revenue:

```sql
SELECT 
  SUM(amount) as total_platform_revenue,
  COUNT(*) as total_payouts
FROM ledgers
WHERE type = 'platform_fee';
```

To see revenue breakdown by club:

```sql
SELECT 
  c.name as club_name,
  SUM(l.amount) as platform_revenue
FROM ledgers l
JOIN clubs c ON l.club_id = c.id
WHERE l.type = 'platform_fee'
GROUP BY c.id, c.name
ORDER BY platform_revenue DESC;
```

## Testing

### Test Payout Flow

1. Ensure user has completed Stripe Connect onboarding
2. Club has sufficient balance
3. Make payout request
4. Check email inbox for initiation email
5. Check phone for SMS (if configured)
6. Use Stripe CLI to trigger `payout.paid` event
7. Verify settlement notifications arrive

### Test Fee Calculation

```javascript
// Example test cases
const testCases = [
  { requested: 100, fee: 5.5, net: 94.5 },
  { requested: 50, fee: 2.75, net: 47.25 },
  { requested: 1000, fee: 55, net: 945 },
  { requested: 23.45, fee: 1.29, net: 22.16 },
];
```

## Important Notes

1. **Phone Number Format**: User phone numbers must be stored in `users.phone` field for SMS notifications
2. **Email Delivery**: Ensure your sending domain is verified in Resend for production
3. **Webhook Security**: Always verify webhook signatures (already implemented)
4. **Instant Payouts**: Stripe charges additional fees for instant payouts (1% with $0.50 minimum). These are deducted from the recipient's payout automatically by Stripe.
5. **Payout Limits**: Stripe has limits on instant payouts (typically $50,000 per payout, $100,000 per day)

## Troubleshooting

### Notifications Not Sending

1. Check environment variables are set
2. Verify API keys are valid
3. Check logs for error messages
4. For SMS: ensure phone numbers are in E.164 format (+1234567890)
5. For email: verify sender domain in Resend

### Webhook Not Triggering

1. Verify webhook endpoint is public and accessible
2. Check webhook signature secret in environment
3. Use Stripe CLI to test locally
4. Check Stripe Dashboard for webhook delivery attempts

### Fee Calculation Issues

1. Verify `platformFeePercent` is set to 0.055 (5.5%)
2. Check that amounts are properly converted to/from cents
3. Review ledger entries to ensure both payout and fee are recorded

## Future Enhancements

- [ ] Add fee configuration per club (variable fee rates)
- [ ] Implement batch payouts with single notification
- [ ] Add payout scheduling (recurring payouts)
- [ ] Create admin dashboard for fee revenue analytics
- [ ] Add email templates for payout failures
- [ ] Support multiple currencies with regional fees
