// app/api/paypal/return/route.ts
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");     // PayPal order id
  const eventId = searchParams.get("eventId"); // your reference back

  if (!token) return NextResponse.redirect(new URL("/payments/error", req.url));

  try {
    // POST /api/paypal/capture-order (reuse your existing endpoint logic)
    await fetch(new URL("/api/paypal/capture-order", req.url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: token, eventId }),
      cache: "no-store",
    });

    // Send to a friendly success page or back to the events list.
    // Use an explicit frontend base (NEXT_PUBLIC_BASE_URL / VERCEL_URL / localhost) so the
    // redirect goes to the expected application host instead of an ephemeral preview host.
    const frontendBase =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    return NextResponse.redirect(`${frontendBase}/events?paid=1`);
  } catch {
    return NextResponse.redirect(new URL("/payments/error", req.url));
  }
}
