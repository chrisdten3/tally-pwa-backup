# Event Payment Flow - Public Links & Auto-Membership

## Overview
Events can now be created without requiring existing members. Users can pay via shareable links/QR codes and will be automatically added to the club upon payment.

## Changes Made

### 1. **CreateEventModal.tsx** - Optional Member Selection
- Removed requirement to select members when creating events
- Updated UI to show helpful text: "Select existing members or leave empty to allow anyone with the link to pay"
- Changed submit button validation to allow events with 0 selected members
- Fixed amount conversion from dollars to cents (multiply by 100)

### 2. **API Route: `/api/events/[eventId]/pay`**
New public endpoint that doesn't require authentication:
- **GET**: Returns event details (title, amount, club, expires_at, etc.)
- **POST**: Creates payment session for anonymous users
  - Accepts: firstName, lastName, phone, email (optional)
  - Finds or creates user by phone number
  - Adds user to club membership if not already a member (with `joined_via_payment: true`)
  - Creates event assignment
  - Returns Stripe checkout session URL

### 3. **Stripe Webhook** - `/api/stripe/webhook/route.ts`
Enhanced to handle public payments:
- When `checkout.session.completed` event is received:
  - Checks if user is already a member
  - If not, adds them to the club with `joined_via_payment: true` flag
  - Marks assignment as paid
  - Updates club balance
  - Creates ledger entry

### 4. **EventShareLink Component**
New reusable component for sharing event payment links:
- Shows shareable URL
- Copy to clipboard functionality
- Native share API support (mobile)
- QR code generation via API
- Toggle to show/hide QR code
- Instructions for how it works

### 5. **Public Payment Page** - `/events/[eventId]/pay/page.tsx`
Beautiful standalone payment page:
- Displays event details (title, amount, club name, expires_at)
- Form for user info (first name, last name, phone, email optional)
- Checks if event is expired
- Creates Stripe checkout session
- Responsive design with gradient background

### 6. **Success Page** - `/events/[eventId]/success/page.tsx`
Payment confirmation page:
- Shows success message
- Informs user they've been added to the club
- Auto-redirects to home after 10 seconds
- Button to manually navigate home

### 7. **Events Page Integration**
- Added EventShareLink component to each event in the list
- Fixed amount display to show dollars instead of cents (divide by 100)

## User Flow

### For Event Creators (Admins)
1. Create event with title, amount, description, optional expiry
2. Optionally select existing members to assign
3. Click "Share Link" button on any event
4. Copy link or show QR code
5. Share via text, email, social media, etc.

### For Payers (Anyone)
1. Receive link or scan QR code
2. See event details on public payment page
3. Enter name and phone number
4. Click "Pay $X.XX" button
5. Complete Stripe checkout
6. Redirected to success page
7. Automatically added to club membership

## Database Changes
No schema changes needed! Uses existing tables:
- `users` - Finds or creates by phone
- `memberships` - Adds with `joined_via_payment: true`
- `club_event_assignees` - Creates assignment
- `payments_pending` - Tracks pending payment
- `ledgers` - Records completed payment
- `clubs` - Updates balance

## Key Features
- ✅ No authentication required to pay
- ✅ Phone-based user identification
- ✅ Automatic club membership on payment
- ✅ QR code generation for easy sharing
- ✅ Event expiration handling
- ✅ Duplicate payment prevention
- ✅ Mobile-friendly share functionality
- ✅ Secure Stripe integration
- ✅ Real-time balance updates

## Testing Checklist
- [ ] Create event without selecting members
- [ ] Generate and copy share link
- [ ] View QR code
- [ ] Open link in incognito/different browser (no auth)
- [ ] Fill form and submit payment
- [ ] Complete Stripe checkout
- [ ] Verify user added to members list
- [ ] Verify payment recorded in ledgers
- [ ] Verify club balance updated
- [ ] Test with existing member (should work)
- [ ] Test duplicate payment prevention
- [ ] Test expired event (should show error)

## Notes
- Amounts are stored in cents (multiply by 100 before saving)
- Phone number is the unique identifier for users
- Users paying via link get `joined_via_payment: true` flag
- Event creators must still be admin to create events
- Existing members can also use the public link to pay
