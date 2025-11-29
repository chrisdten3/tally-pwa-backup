# Surge Migration Guide

## Migration from Twilio to Surge

This document outlines the steps to complete the migration from Twilio to Surge for SMS functionality.

## What Changed

### Files Updated

1. **New file:** `src/lib/surge.ts` - New Surge SMS client (replaces `src/lib/twilio.ts`)
2. **Updated imports in:**
   - `src/app/api/stripe/payout/route.ts`
   - `src/app/api/stripe/webhook/route.ts`
   - `src/app/api/events/route.ts`
   - `src/app/api/events/[eventId]/reminders/route.ts`

### Package Changes

- **Added:** `@surgeapi/node` - Surge SMS client
- **To Remove:** `twilio` (optional - can be removed if no longer needed)

## Environment Variables

### Old Twilio Variables (can be removed)

```env
TWILIO_ACCOUNT_SID="..."
TWILIO_AUTH_TOKEN="..."
TWILIO_PHONE_NUMBER="..."
TWILIO_MESSAGING_SERVICE_SID="..." (if you had this)
```

### New Surge Variables (required)

Add this to your `.env` file:

```env
SURGE_API_KEY="your_surge_api_key_here"
```

## Getting Your Surge API Key

1. Sign up or log in at [Surge](https://www.surge.app/)
2. Navigate to your [API Keys page](https://www.surge.app/dashboard/api-keys)
3. Create a new API key or copy an existing one
4. Add it to your `.env` file as `SURGE_API_KEY`

## API Compatibility

The Surge implementation maintains the same function signatures as Twilio, so no additional code changes are needed:

- `sendSMS({ to, message })` - Works the same way
- `sendBulkSMS(recipients, message)` - Works the same way
- `formatEventNotification({ ... })` - No changes

## Testing

After updating your environment variables, test the SMS functionality:

1. Update your `.env` file with `SURGE_API_KEY`
2. Restart your development server
3. Test sending an SMS through your application
4. Check the console logs for `[Surge]` prefixed messages

## Key Differences

### Phone Number Format

Both Twilio and Surge use E.164 format (`+1234567890`), so phone number handling remains the same.

### Response Format

- **Twilio:** Returns `message.sid`
- **Surge:** Returns `response.id`

The implementation abstracts this as `messageSid` in both cases for consistency.

### Error Handling

Both services have similar error handling patterns, so your existing error handling should work without changes.

## Rollback

If you need to rollback to Twilio:

1. Revert the import changes in the API routes (change `@/lib/surge` back to `@/lib/twilio`)
2. Restore your Twilio environment variables
3. Reinstall `twilio` package: `npm install twilio`

## Cost Comparison

Make sure to review [Surge's pricing](https://www.surge.app/pricing) compared to your Twilio costs.

## Support

- Surge Documentation: https://docs.surge.app/
- Surge API Reference: https://docs.surge.app/api-reference
- npm Package: https://www.npmjs.com/package/@surgeapi/node
