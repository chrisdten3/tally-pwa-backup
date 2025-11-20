# Quick Stripe Payout Testing Guide

## TL;DR - Test Account Numbers for Instant Payouts

When going through Stripe Connect onboarding in **test mode**, use these credentials:

### Bank Account (Required)
- **Routing Number**: `110000000`
- **Account Number**: `000123456789`

### Debit Card (Required for Instant Payouts)
- **Card Number**: `4000056655665556`
- **Expiration**: `12/28` (or any future date)
- **CVC**: `123` (or any 3 digits)
- **ZIP**: `12345` (or any 5 digits)

### Personal/Business Info (for Individual account)
- **First Name**: Test
- **Last Name**: User
- **DOB**: `01/01/1990`
- **SSN**: `000000000` (nine zeros in test mode)
- **Address**: Any valid US address format

## How It Works

The payout system now does **TWO operations**:

1. **Transfer**: Moves money from your platform balance → connected account balance
2. **Payout**: Triggers instant payout from connected account → their bank/debit card

This is the correct way to handle payouts to Stripe Connect Express accounts.

## Quick Test Steps

1. **Onboard User**
   ```
   Go to /profile → Click "Onboard for payouts"
   Use credentials above
   ```

2. **Add Club Balance**
   ```sql
   UPDATE clubs SET balance = 100.00 WHERE id = 'your-club-id';
   ```

3. **Send Test Payout**
   ```
   Go to /payments
   Select club
   Enter amount (e.g., 10.00)
   Submit
   ```

4. **Verify Success**
   - Check Stripe Dashboard → Transfers (should see transfer to connected account)
   - Check Stripe Dashboard → Connect → Accounts → [Your Account] → Payouts
   - Check your database: `clubs.balance` decreased, `ledgers` has new entry

## What Happens in Test Mode

✅ Transfer appears in Stripe Dashboard  
✅ Payout appears in connected account's dashboard  
✅ Your database is updated correctly  
✅ No real money moves  
❌ No actual bank deposit occurs  
❌ Cannot test with real bank accounts in test mode  

## Common Test Scenarios

### ✓ Success (Instant Payout)
- Account `000123456789` + Debit Card `4000056655665556`
- Status: `paid` immediately
- Shows in dashboard as "Instant payout"

### ✗ Instant Not Available (Falls back to standard)
- Account `000111111116` (no debit card)
- Status: `in_transit`
- Takes 2-3 business days (in production)

### ✗ Failed Payout
- Use test card `4000058260000005` (instant payout declined)
- Error returned from Stripe API

## Testing API Directly

```bash
# 1. Get your auth token (from browser console)
localStorage.getItem('token')

# 2. Make request
curl -X POST http://localhost:3000/api/stripe/payout \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "clubId": "your-club-id",
    "userId": "your-user-id",
    "amount": 10.50
  }'
```

## Troubleshooting

**"Recipient user has not completed Stripe onboarding"**
→ Check if `users.stripe_account_id` exists in database

**"Insufficient club balance"**
→ Add balance: `UPDATE clubs SET balance = 100 WHERE id = 'club-id'`

**"Instant payouts are not enabled"**
→ Make sure you added debit card `4000056655665556` during onboarding

**"No such destination"**
→ The `stripe_account_id` is invalid or deleted. Re-onboard the user.

## Next Steps for Production

Before going live:
1. Switch to live Stripe keys (`sk_live_...`)
2. Users must provide real bank accounts and complete real identity verification
3. Instant payouts require real debit cards
4. Consider fee implications (~1% + $0.25 for instant, $0 for standard)
5. Implement webhook handlers for `payout.failed`, `payout.paid` events
6. Add UI to show payout history and status
