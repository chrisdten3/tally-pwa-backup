// components/EventPayButton.tsx
"use client";
type Props = { eventId: string; authToken: string };

export default function EventPayButton({ eventId, authToken }: Props) {
  const createStripeSession = async () => {
    try {
      const res = await fetch("/api/stripe/create-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ eventId }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "create-session failed");
      if (j.url) {
        window.location.href = j.url;
      } else {
        throw new Error("No session URL returned from server");
      }
    } catch (e) {
      console.error("Stripe session creation failed:", e);
      alert((e as any)?.message || "Payment initiation failed");
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={createStripeSession}
        className="bg-bright-indigo text-white py-2 px-4 rounded-md hover:bg-bright-indigo/90 transition-colors"
      >
        Pay with Card
      </button>
    </div>
  );
}
