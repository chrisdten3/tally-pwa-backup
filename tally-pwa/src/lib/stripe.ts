import crypto from "crypto";

const STRIPE_BASE = "https://api.stripe.com";

function getSecret() {
  const k = process.env.STRIPE_SECRET_KEY;
  if (!k) throw new Error("Missing STRIPE_SECRET_KEY in environment");
  return k;
}

export async function createCheckoutSession({
  amountCents,
  currency = "usd",
  eventId,
  assignmentId,
  successUrl,
  cancelUrl,
  name = "Tally Event Payment",
}: {
  amountCents: number;
  currency?: string;
  eventId?: string;
  assignmentId?: string;
  successUrl?: string;
  cancelUrl?: string;
  name?: string;
}) {
  const secret = getSecret();

  const body = new URLSearchParams();
  // Required fields for a simple Checkout Session
  body.append("payment_method_types[]", "card");
  body.append("mode", "payment");
  body.append("line_items[0][price_data][currency]", currency);
  body.append("line_items[0][price_data][product_data][name]", name);
  body.append("line_items[0][price_data][unit_amount]", String(amountCents));
  body.append("line_items[0][quantity]", "1");

  if (successUrl) body.append("success_url", successUrl);
  if (cancelUrl) body.append("cancel_url", cancelUrl);
  if (eventId) body.append("client_reference_id", eventId);
  if (assignmentId) body.append("metadata[assignment_id]", assignmentId);
  if (eventId) body.append("metadata[event_id]", eventId);

  const res = await fetch(`${STRIPE_BASE}/v1/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error?.message || "Stripe create session failed");
  return j;
}

export function verifyStripeSignature(payload: string, sigHeader: string | null) {
  // sigHeader format: t=12345,v1=abcdef,v0=...
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("Missing STRIPE_WEBHOOK_SECRET in env");
  if (!sigHeader) return false;

  const parts = sigHeader.split(",");
  const kv: Record<string, string[]> = {};
  for (const p of parts) {
    const [k, v] = p.split("=");
    if (!kv[k]) kv[k] = [];
    kv[k].push(v);
  }
  const t = kv["t"]?.[0];
  const v1 = kv["v1"];
  if (!t || !v1 || v1.length === 0) return false;

  const signed = `${t}.${payload}`;
  const h = crypto.createHmac("sha256", secret).update(signed).digest("hex");

  // timing-safe compare against any v1 signature
  const sigBuf = Buffer.from(h, "hex");
  for (const candidate of v1) {
    try {
      const candBuf = Buffer.from(candidate, "hex");
      if (candBuf.length !== sigBuf.length) continue;
      if (crypto.timingSafeEqual(candBuf, sigBuf)) return true;
    } catch (e) {
      continue;
    }
  }
  return false;
}

export function amountToCents(amount: number | string) {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return Math.round(n * 100);
}

export async function createExpressAccount({ country = "US", email }: { country?: string; email?: string }) {
  const secret = getSecret();
  const body = new URLSearchParams();
  body.append("type", "express");
  if (country) body.append("country", country);
  if (email) body.append("email", email);
  // NOTE: some Stripe API configurations reject capabilities at account creation.
  // To maximize compatibility, don't request capabilities here; platforms can request them
  // later via the Accounts API if necessary.

  const res = await fetch(`${STRIPE_BASE}/v1/accounts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    // include the full Stripe response for easier debugging (safe for dev)
    const msg = j?.error?.message || JSON.stringify(j) || "Stripe create account failed";
    throw new Error(msg);
  }
  return j;
}

export async function createAccountLink({ accountId, refreshUrl, returnUrl }: { accountId: string; refreshUrl: string; returnUrl: string }) {
  const secret = getSecret();
  const body = new URLSearchParams();
  body.append("account", accountId);
  body.append("refresh_url", refreshUrl);
  body.append("return_url", returnUrl);
  body.append("type", "account_onboarding");

  const res = await fetch(`${STRIPE_BASE}/v1/account_links`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = j?.error?.message || JSON.stringify(j) || "Stripe create account link failed";
    throw new Error(msg);
  }
  return j;
}

export async function createInstantPayout({
  stripeAccountId,
  amountCents,
  currency = "usd",
  description,
}: {
  stripeAccountId: string;
  amountCents: number;
  currency?: string;
  description?: string;
}) {
  const secret = getSecret();
  
  // First, create a transfer to the connected account's balance
  const transferBody = new URLSearchParams();
  transferBody.append("amount", String(amountCents));
  transferBody.append("currency", currency);
  transferBody.append("destination", stripeAccountId);
  if (description) transferBody.append("description", description);

  const transferRes = await fetch(`${STRIPE_BASE}/v1/transfers`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: transferBody.toString(),
    cache: "no-store",
  });
  const transfer = await transferRes.json().catch(() => ({}));
  if (!transferRes.ok) {
    const msg = transfer?.error?.message || JSON.stringify(transfer) || "Stripe transfer failed";
    throw new Error(msg);
  }

  // Then, trigger an instant payout from the connected account to their bank
  const payoutBody = new URLSearchParams();
  payoutBody.append("amount", String(amountCents));
  payoutBody.append("currency", currency);
  payoutBody.append("method", "instant"); // instant payout
  if (description) payoutBody.append("description", description);

  const payoutRes = await fetch(`${STRIPE_BASE}/v1/payouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Account": stripeAccountId, // Act on behalf of connected account
    },
    body: payoutBody.toString(),
    cache: "no-store",
  });
  const payout = await payoutRes.json().catch(() => ({}));
  if (!payoutRes.ok) {
    const msg = payout?.error?.message || JSON.stringify(payout) || "Stripe payout failed";
    throw new Error(msg);
  }

  // Return combined info
  return {
    transfer,
    payout,
    id: payout.id,
    status: payout.status,
    arrival_date: payout.arrival_date,
  };
}

export default {
  createCheckoutSession,
  verifyStripeSignature,
  amountToCents,
  createExpressAccount,
  createAccountLink,
  createInstantPayout,
};
