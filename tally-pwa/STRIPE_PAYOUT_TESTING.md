# Stripe Instant Payout Testing Guide

## Overview
The Stripe payout system allows club admins to send instant payouts to users who have completed Stripe Connect onboarding. The payout amount is deducted from the club balance and sent directly to the recipient's Stripe account.

## Prerequisites

### 1. Environment Setup
Ensure you have the following environment variables set:
```bash
STRIPE_SECRET_KEY=sk_test_...  # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_...  # For webhook verification (if testing webhooks)
```

### 2. Database Schema
Make sure the following columns exist:

**users table:**
- `stripe_account_id` (TEXT) - Stores the Stripe Connect account ID

**clubs table:**
- `balance` (NUMERIC) - Current club balance
- `stripe_account_id` (TEXT) - Optional, for club-level Stripe account

**payouts table:** (may need to be created)
```sql
CREATE TABLE IF NOT EXISTS payouts (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  receiver TEXT,
  receiver_type TEXT,
  provider TEXT,
  provider_batch_id TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  raw JSONB,
  initiated_by TEXT,
  recipient_user_id TEXT
);
```

**ledgers table:**
- Should support `type = 'payout'`
- Negative amounts for payouts

### 3. Stripe Connect Setup
Users receiving payouts must complete Stripe Connect onboarding:

1. User clicks "Onboard for payouts" button on profile page
2. System creates Stripe Express account via `/api/stripe/connect/onboard`
3. User completes Stripe onboarding flow
4. `stripe_account_id` is saved to the user's record

## Testing Flow

### Step 1: Onboard a Test User

1. **Login as a user** who will receive payouts
2. **Navigate to profile page** (`/profile`)
3. **Click "Onboard for payouts"** (if `stripe_account_id` is null)
4. **Complete Stripe Connect onboarding**
   - Use test bank account: `000123456789` (routing: `110000000`)
   - Use test debit card for instant payouts: `4000056655665556`
   - Fill in required business/individual information
5. **Verify onboarding completed** - `stripe_account_id` should now be populated in database

### Step 2: Add Balance to Club

Ensure the club has sufficient balance to send a payout. You can:
- Make a test payment via Stripe checkout
- Manually update the club balance in database:
```sql
UPDATE clubs SET balance = 100.00 WHERE id = 'your-club-id';
```

### Step 3: Send a Payout

#### Using API Directly (Recommended for Testing)

```bash
# Get your auth token
TOKEN="your-jwt-token"

# Send payout request
curl -X POST http://localhost:3000/api/stripe/payout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clubId": "your-club-id",
    "userId": "recipient-user-id",
    "amount": 10.50,
    "description": "Test payout"
  }'
```

#### Expected Response (Success)
```json
{
  "ok": true,
  "payout": {
    "id": "payout_1234567890_abc123",
    "stripePayoutId": "po_1234567890abcdef",
    "amount": 10.50,
    "status": "paid",
    "recipient": "user@example.com",
    "newClubBalance": 89.50
  }
}
```

#### Expected Response (Errors)
```json
// Insufficient balance
{
  "error": "Insufficient club balance"
}

// User not onboarded
{
  "error": "Recipient user has not completed Stripe onboarding",
  "details": "User must connect their Stripe account to receive payouts"
}

// Not admin
{
  "error": "Forbidden: Admin access required"
}
```

### Step 4: Verify Database Changes

After successful payout:

1. **Check club balance updated:**
```sql
SELECT id, name, balance FROM clubs WHERE id = 'your-club-id';
-- Balance should be decreased by payout amount
```

2. **Check payout record created:**
```sql
SELECT * FROM payouts WHERE club_id = 'your-club-id' ORDER BY created_at DESC LIMIT 1;
-- Should show new payout with status 'paid' or 'in_transit'
```

3. **Check ledger entry created:**
```sql
SELECT * FROM ledgers WHERE club_id = 'your-club-id' AND type = 'payout' ORDER BY created_at DESC LIMIT 1;
-- Should show negative amount, balance_before, balance_after
```

### Step 5: Check Stripe Dashboard

1. Go to [Stripe Dashboard - Test Mode](https://dashboard.stripe.com/test/payouts)
2. You should see the payout listed
3. Check the payout status (instant payouts should show as "Paid")
4. Verify the connected account received the payout

## Testing Scenarios

### Scenario 1: Successful Instant Payout
- ✅ User has `stripe_account_id`
- ✅ User completed onboarding with debit card
- ✅ Club has sufficient balance
- ✅ Requester is club admin
- **Expected:** Payout succeeds, balance updated, ledger created

### Scenario 2: User Not Onboarded
- ❌ User has no `stripe_account_id`
- ✅ Club has sufficient balance
- ✅ Requester is club admin
- **Expected:** Error "Recipient user has not completed Stripe onboarding"

### Scenario 3: Insufficient Balance
- ✅ User has `stripe_account_id`
- ❌ Club balance < payout amount
- ✅ Requester is club admin
- **Expected:** Error "Insufficient club balance"

### Scenario 4: Non-Admin Request
- ✅ User has `stripe_account_id`
- ✅ Club has sufficient balance
- ❌ Requester is not club admin
- **Expected:** Error "Forbidden: Admin access required"

### Scenario 5: Instant Payout Not Available
- ✅ User onboarded but without instant payout-capable debit card
- ✅ Club has sufficient balance
- ✅ Requester is club admin
- **Expected:** Stripe error about instant payouts not available (falls back to standard payout)

## Stripe Test Data

### Test Bank Accounts (for standard payouts)
- Routing: `110000000`
- Account: `000123456789`

### Test Debit Cards (for instant payouts)
- **Visa (instant payout eligible):** `4000056655665556`
- **Visa (instant payout declined):** `4000058260000005`

### Test SSN (US Individual)
- `000000000` (for test mode)

## Common Issues

### Issue: "Instant payouts not available"
**Cause:** User didn't add a debit card during onboarding, or card doesn't support instant payouts.
**Solution:** Have user add a test debit card `4000056655665556` in their Stripe Express dashboard.

### Issue: "Insufficient funds"
**Cause:** Your Stripe test account doesn't have enough balance.
**Solution:** In test mode, Stripe simulates payouts without requiring actual balance. If you see this error, it might be checking your club balance instead - ensure club.balance >= payout amount.

### Issue: "No such connected account"
**Cause:** The `stripe_account_id` stored in database doesn't exist or was deleted.
**Solution:** Have user complete onboarding again to get a new account ID.

### Issue: Database constraint violations
**Cause:** Missing required columns or tables.
**Solution:** Run database migrations to add required columns.

## Monitoring & Debugging

### Check Stripe Logs
```bash
# Listen to Stripe events (if webhook testing)
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### Check Application Logs
Look for:
- "Stripe payout error:" - Stripe API errors
- "Failed to persist payout in database:" - Database errors

### Test Mode vs Live Mode
Always use **test mode** keys (`sk_test_...`) for development. Never use live keys with test data.

## Production Considerations

1. **Fees:** Instant payouts have additional fees (~1% + $0.25)
2. **Limits:** Stripe has daily/monthly payout limits per account
3. **Onboarding:** Users must complete identity verification
4. **Failed Payouts:** Implement webhook listeners for `payout.failed` events
5. **Reconciliation:** Regularly reconcile Stripe payouts with your ledger

## API Reference

### POST `/api/stripe/payout`

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```typescript
{
  clubId: string;      // Required: Club ID to deduct from
  userId: string;      // Required: Recipient user ID (must have stripe_account_id)
  amount: number;      // Required: Amount in dollars (e.g., 10.50)
  description?: string; // Optional: Payout description
}
```

**Response (200):**
```typescript
{
  ok: true;
  payout: {
    id: string;              // Internal payout ID
    stripePayoutId: string;  // Stripe payout ID (po_...)
    amount: number;          // Amount sent
    status: string;          // Stripe payout status
    recipient: string;       // Recipient email/name
    newClubBalance: number;  // Updated club balance
  }
}
```

**Errors:**
- `401` - Not authenticated
- `400` - Missing fields, invalid amount, insufficient balance, user not onboarded
- `403` - Not club admin
- `404` - Club or user not found
- `500` - Stripe API error or database error

---

## Quick Test Checklist

- [ ] User completed Stripe Connect onboarding
- [ ] User's `stripe_account_id` is populated in database
- [ ] Club has sufficient balance
- [ ] Requesting user is club admin
- [ ] `STRIPE_SECRET_KEY` environment variable is set
- [ ] Test request sent successfully
- [ ] Club balance decreased correctly
- [ ] Payout record created in database
- [ ] Ledger entry created with negative amount
- [ ] Payout visible in Stripe Dashboard
