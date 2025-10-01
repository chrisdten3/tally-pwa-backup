// components/EventPayButton.tsx
"use client";
import { useEffect, useRef } from "react";
import Script from "next/script";

type Props = {
  eventId: string;
  authToken: string; // "mock-token-<email>"
};

export default function EventPayButton({ eventId, authToken }: Props) {
  const btnRef = useRef<HTMLDivElement>(null);

  // Render buttons after SDK loads
  useEffect(() => {
    const w = window as any;
    if (!w.paypal || !btnRef.current) return;
    const buttons = w.paypal.Buttons({
      createOrder: async () => {
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
        return j.id;
      },
      onApprove: async (data: any) => {
        const r = await fetch("/api/paypal/capture-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: data.orderID }),
        });
        const capture = await r.json();
        if (!r.ok) throw new Error(capture.error || "capture failed");
        // TODO: toast success + refresh events
      },
      onError: (err: any) => {
        console.error(err);
        // TODO: toast error
      },
      style: { shape: "pill", layout: "horizontal" },
    });
    buttons.render(btnRef.current);
    return () => buttons.close();
  }, [eventId, authToken]);

  return (
    <>
      {/* Load SDK once at app root ideally; including here for portability */}
      <Script
        src={`https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}&components=buttons&currency=USD&intent=CAPTURE`}
        strategy="afterInteractive"
      />
      <div ref={btnRef} />
    </>
  );
}
