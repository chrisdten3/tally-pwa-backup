# Payout Fee Structure - Quick Reference

## 💰 Fee Model: 5.5% + $0.30

**Why this structure?**
- Mirrors Stripe's fee model (familiar to users)
- Ensures profitability on all transaction sizes
- Nets exactly **2.6% profit** every time

## Math Breakdown

```
Your Platform:   5.5% + $0.30
Stripe Charges: -2.9% - $0.30
─────────────────────────────
Net Profit:      2.6% + $0.00  ✅ Pure profit!
```

## Real Examples

### $100 Payout
```
Requested:        $100.00
Your Fee:         -$5.80  (5.5% + $0.30)
User Receives:    $94.20
──────────────────────────
Stripe Takes:     -$3.20  (2.9% + $0.30)
Your Profit:      $2.60   (2.6%)
```

### $50 Payout
```
Requested:        $50.00
Your Fee:         -$3.05  (5.5% + $0.30)
User Receives:    $46.95
──────────────────────────
Stripe Takes:     -$1.75  (2.9% + $0.30)
Your Profit:      $1.30   (2.6%)
```

### $10 Payout (Micro-payment)
```
Requested:        $10.00
Your Fee:         -$0.85  (5.5% + $0.30)
User Receives:    $9.15
──────────────────────────
Stripe Takes:     -$0.59  (2.9% + $0.30)
Your Profit:      $0.26   (2.6%)
```

### $1,000 Payout
```
Requested:        $1,000.00
Your Fee:         -$55.30   (5.5% + $0.30)
User Receives:    $944.70
──────────────────────────
Stripe Takes:     -$29.30   (2.9% + $0.30)
Your Profit:      $26.00    (2.6%)
```

## Key Benefits

✅ **Consistent 2.6% profit margin** on every transaction
✅ **Fixed $0.30 protects against micro-payment losses**
✅ **Transparent to users** (mirrors Stripe's familiar structure)
✅ **Profitable at any amount** (even $5 payouts)

## Implementation

```typescript
// Fee calculation
const platformFeePercent = 0.055;  // 5.5%
const platformFeeFixed = 0.30;      // $0.30
const platformFee = (amount * platformFeePercent) + platformFeeFixed;
const netPayout = amount - platformFee;
```

## Notifications

- **SMS only** (no emails)
- Sent on payout initiation
- Sent when payout settles
- Requires user phone number in profile

## User-Facing Language

> **Platform Fee: 5.5% + $0.30**
> 
> A platform fee of 5.5% + $0.30 is deducted from each payout to cover payment processing costs.
> 
> Example: Request $100 → Platform fee $5.80 → You receive $94.20

## Revenue Tracking

```sql
-- Total platform revenue
SELECT SUM(amount) as total_revenue
FROM ledgers
WHERE type = 'platform_fee';

-- Revenue by club
SELECT 
  c.name,
  SUM(l.amount) as revenue
FROM ledgers l
JOIN clubs c ON l.club_id = c.id
WHERE l.type = 'platform_fee'
GROUP BY c.id, c.name
ORDER BY revenue DESC;
```

## Files Modified

- `/v3-dev/src/app/api/stripe/payout/route.ts` - Fee calculation
- `/v3-dev/src/app/api/stripe/webhook/route.ts` - Webhook handlers (SMS only)
- `/v3-dev/src/app/(dashboard)/payouts/page.tsx` - UI with fee info + phone prompt

## Environment Variables

```bash
# Twilio (SMS notifications)
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_MESSAGING_SERVICE_SID=MGxxxxx
```

## Testing

```bash
# Test locally with Stripe CLI
stripe listen --forward-to localhost:3000/api/stripe/webhook
stripe trigger payout.paid
stripe trigger payout.failed
```
