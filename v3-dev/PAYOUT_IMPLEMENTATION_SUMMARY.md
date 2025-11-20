# Payout Implementation Summary

## ✅ Completed Implementation

### 1. Fee Structure (5.5% + $0.30)
- **Stripe's cost**: 2.9% + $0.30 per transaction
- **Platform fee**: 5.5% + $0.30 on all payouts
- **Net profit**: 2.6% + $0.00 every time

**Why this structure?**
- Mirrors Stripe's fee model, so users understand it immediately
- Fixed $0.30 ensures profitability on micro-payments
- Always nets exactly 2.6% pure profit

**Example:**
```
User requests $100 payout
Platform fee: (5.5% × $100) + $0.30 = $5.50 + $0.30 = $5.80
Platform sends to user: $100 - $5.80 = $94.20
Platform keeps: $5.80

Stripe charges: (2.9% × $100) + $0.30 = $2.90 + $0.30 = $3.20
Net platform profit: $5.80 - $3.20 = $2.60 (exactly 2.6%)
```

### 2. Files Created/Modified

#### New Files:
- ✅ `/v3-dev/src/lib/email.ts` - Email service with Resend API
- ✅ `/v3-dev/src/app/api/stripe/payout/route.ts` - Payout API with fee calculation
- ✅ `/v3-dev/PAYOUT_FEE_NOTIFICATIONS.md` - Complete documentation

#### Modified Files:
- ✅ `/v3-dev/src/app/api/stripe/webhook/route.ts` - Added payout.paid and payout.failed handlers
- ✅ `/v3-dev/.env.example` - Added Resend configuration

### 3. Notification System

#### When Payout is Initiated:
- � **SMS** to admin with:
  - Net payout amount
  - Platform fee breakdown (5.5% + $0.30)
  - Recipient name
  - Payout ID
- ⚠️ If admin has no phone number, API returns `needsPhoneNumber: true`

#### When Payout Settles (via webhook):
- � **SMS** to admin confirming:
  - Successful transfer
  - Amount deposited
  - Recipient name
  - Payout ID

#### If Payout Fails:
- 📱 **SMS** alert to admin with failure reason
- Status updated to "failed" in database

**Note**: Email notifications have been removed to keep it simple - SMS only.

### 4. Database Changes

Two ledger entries created per payout:

1. **Payout Entry** (`type: "payout"`):
   - Amount: negative (deducted from club)
   - Includes description with fee breakdown

2. **Platform Fee Entry** (`type: "platform_fee"`):
   - Amount: positive (platform revenue)
   - Links to payout ID

## 🔧 Setup Required

### 1. Install Dependencies
```bash
cd v3-dev
# No new packages needed - using existing Twilio for SMS
```

### 2. Configure Environment Variables
Add to `.env.local`:
```bash
# SMS notifications (already have Twilio)
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_MESSAGING_SERVICE_SID=MGxxxxx
```

### 3. Set Up Twilio (if not already done)
1. Sign up at https://twilio.com
2. Get a phone number or messaging service
3. Add credentials to environment variables

### 4. Configure Stripe Webhooks
Add these events to your webhook endpoint:
- ✅ `checkout.session.completed` (already enabled)
- 🆕 `payout.paid` (new)
- 🆕 `payout.failed` (new)

### 5. Ensure Users Have Phone Numbers
Users must add phone numbers to their profile to receive payout notifications.
- Phone number stored in `users.phone` field
- Payout page shows alert if admin has no phone number
- API returns `needsPhoneNumber: true` if phone is missing

## 📊 Revenue Tracking

Query total platform revenue:
```sql
SELECT 
  SUM(amount) as total_revenue,
  COUNT(*) as total_payouts
FROM ledgers
WHERE type = 'platform_fee';
```

Revenue by club:
```sql
SELECT 
  c.name,
  SUM(l.amount) as revenue
FROM ledgers l
JOIN clubs c ON l.club_id = c.id
WHERE l.type = 'platform_fee'
GROUP BY c.id, c.name
ORDER BY revenue DESC;
```

## 🧪 Testing

### Test Locally with Stripe CLI:
```bash
# Forward webhooks to localhost
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger payout events
stripe trigger payout.paid
stripe trigger payout.failed
```

### Test Payout Flow:
1. Initiate payout via API
2. Check email for initiation notification
3. Check SMS (if phone configured)
4. Trigger `payout.paid` webhook
5. Verify settlement notifications

## 📈 Fee Calculation Examples

| Requested | Platform Fee (5.5% + $0.30) | Net to Recipient | Platform Profit* |
|-----------|----------------------------|------------------|------------------|
| $100.00   | $5.80                      | $94.20           | $2.60 (2.6%)     |
| $50.00    | $3.05                      | $46.95           | $1.30 (2.6%)     |
| $1,000.00 | $55.30                     | $944.70          | $26.00 (2.6%)    |
| $10.00    | $0.85                      | $9.15            | $0.26 (2.6%)     |

*After Stripe's 2.9% + $0.30

## 🚨 Important Notes

1. **Instant Payout Fees**: Stripe charges additional 1% + $0.50 for instant payouts (automatically deducted)
2. **Payout Limits**: Typically $50K per payout, $100K per day
3. **Phone Format**: Must be E.164 format (+1234567890) for SMS
4. **Email Domain**: Verify sending domain in Resend for production
5. **Webhook Security**: Signature verification already implemented

## 📝 Next Steps

1. ✅ Verify Twilio is configured
2. ✅ Add environment variables
3. ✅ Configure Stripe webhook events
4. ✅ Ensure users add phone numbers to profiles
5. ✅ Test payout flow end-to-end
6. ✅ Deploy to production
7. Monitor revenue in ledgers table

## 📚 Documentation

Full documentation available in:
- `/v3-dev/PAYOUT_FEE_NOTIFICATIONS.md`

Contains:
- Detailed setup instructions
- API reference
- Database schema
- Troubleshooting guide
- Revenue tracking queries
- Email template previews
