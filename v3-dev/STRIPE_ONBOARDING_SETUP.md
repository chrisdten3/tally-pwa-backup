# Stripe Connect Onboarding Setup

This guide explains how the Stripe Connect onboarding flow works in the application.

## Overview

The app uses **Stripe Connect Express** accounts to enable users to receive payouts directly to their bank accounts. The onboarding flow creates a connected account and guides users through Stripe's onboarding process.

## Files Created

### API Routes

1. **`/api/stripe/connect/onboard`** (POST)
   - Creates or retrieves a Stripe Express account for the authenticated user
   - Generates an account link for onboarding
   - Stores the `stripe_account_id` in the database
   - Returns the onboarding URL

2. **`/api/stripe/connect/callback`** (GET)
   - Handles the redirect after Stripe onboarding completes
   - Redirects to settings page with success/error status

3. **`/api/auth/user`** (GET)
   - Fetches current user data including Stripe account status
   - Used to check if user has completed onboarding

### Database Migration

**File:** `db/migrations/20251118_add_stripe_account_id_to_users.sql`

Adds the `stripe_account_id` column to the `users` table.

```sql
ALTER TABLE users ADD COLUMN stripe_account_id TEXT;
```

### UI Components

**Settings Page** (`app/(dashboard)/settings/page.tsx`)
- Shows Stripe connection status
- Displays "Connect Stripe Account" button for unconnected users
- Shows success/error messages after onboarding
- Allows users to update their Stripe account

## How It Works

### 1. User Initiates Onboarding

When a user clicks "Connect Stripe Account" in settings:

```typescript
const res = await fetch("/api/stripe/connect/onboard", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` }
});

const data = await res.json();
if (data.url) {
  window.location.href = data.url; // Redirect to Stripe
}
```

### 2. Backend Creates Account

The `/api/stripe/connect/onboard` endpoint:

1. Checks if user already has a Stripe account
2. If not, creates a new Express account via `createExpressAccount()`
3. Stores the account ID in the database
4. Creates an account link via `createAccountLink()` with:
   - `returnUrl`: Where to redirect after successful onboarding
   - `refreshUrl`: Where to redirect if user needs to restart

### 3. User Completes Stripe Onboarding

Stripe guides the user through:
- Business information
- Bank account details
- Identity verification
- Tax information

### 4. Return to App

After completion, Stripe redirects to `/api/stripe/connect/callback`, which:
- Redirects to `/settings?stripe=success` (or `error`)
- Settings page displays success message

## Usage in Other Pages

You can add Stripe onboarding to any page:

```typescript
const handleConnectStripe = async () => {
  const token = localStorage.getItem("token");
  const res = await fetch("/api/stripe/connect/onboard", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const data = await res.json();
  if (data.url) {
    window.location.href = data.url;
  }
};
```

## Checking Stripe Status

```typescript
const checkStripeStatus = async () => {
  const token = localStorage.getItem("token");
  const res = await fetch("/api/auth/user", {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const data = await res.json();
  const hasStripe = !!data.user?.stripe_account_id;
  return hasStripe;
};
```

## Environment Variables Required

Make sure these are set in your `.env.local`:

```bash
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Database Setup

Run the migration to add the `stripe_account_id` column:

```bash
# If using Supabase CLI
supabase db push

# Or run the SQL directly in your database
psql $DATABASE_URL -f db/migrations/20251118_add_stripe_account_id_to_users.sql
```

## Testing the Flow

1. Navigate to `/settings`
2. Look for the "Payment Methods" card
3. Click "Connect Stripe Account"
4. Complete the Stripe onboarding flow (use test data in test mode)
5. You'll be redirected back with a success message

## Stripe Functions Available

From `lib/stripe.ts`:

- `createExpressAccount({ country, email })` - Creates a Stripe Express account
- `createAccountLink({ accountId, refreshUrl, returnUrl })` - Generates onboarding link
- `createCheckoutSession(...)` - Creates payment checkout
- `createInstantPayout(...)` - Sends payout to connected account

## Next Steps

Consider implementing:
- Account status checking (to verify account is fully onboarded)
- Re-onboarding for accounts that need updates
- Dashboard for users to view their Stripe balance
- Payout history display
