// components/EventPayButton.tsx
"use client";
import { PayPalButtons } from "@paypal/react-paypal-js";

type Props = { eventId: string; authToken: string };

export default function EventPayButton({ eventId, authToken }: Props) {
  const createOrder = async () => {
    const r = await fetch("/api/paypal/create-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ eventId }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "create-order failed");
    return j.id; // orderID
  };

  const onApprove = async (data: any) => {
    const r = await fetch("/api/paypal/capture-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: data.orderID }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "capture failed");
    // TODO: toast + refresh events
  };

  return (
    <div className="flex gap-2">
      {/* Standard PayPal button(s) */}
      <PayPalButtons
        style={{ layout: "horizontal", shape: "pill" }}
        createOrder={createOrder}
        onApprove={onApprove}
        onError={(e) => console.error(e)}
      />

      {/* Venmo-only button — renders only if eligible */}
      <PayPalButtons
        fundingSource="venmo"
        style={{ layout: "horizontal", shape: "pill" }}
        createOrder={createOrder}
        onApprove={onApprove}
        onError={(e) => console.error(e)}
      />
    </div>
  );
}
