"use client";

import { useState } from "react";
import { X, CreditCard } from "lucide-react";

type AssignedEventLite = {
  id: string;
  title: string;
  amount: number;
  expires_at: string | null;
  club: { id: string; name: string };
};

type Props = {
  event: AssignedEventLite;
  authToken: string;
  onClose: () => void;
  onPaid?: () => void; // called after successful capture
};

export default function PayChoiceModal({ event, authToken, onClose, onPaid: _onPaid }: Props) {
  const [processing, setProcessing] = useState(false);
  const amount = Number(event.amount || 0);
  const amountLabel = amount.toFixed(2);

  // Stripe Checkout flow
  const createStripeSession = async () => {
    setProcessing(true);
    try {
      const res = await fetch("/api/stripe/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ eventId: event.id }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "create-session failed");
      if (j.url) {
        window.location.href = j.url;
      } else {
        throw new Error("No session URL returned from server");
      }
    } catch (e) {
      console.error("Stripe session creation failed:", e);
      alert((e as any)?.message || "Payment initiation failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#0b0b0f] border border-black/10 dark:border-white/10 rounded-2xl p-5 max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{event.title}</h2>
            <p className="text-sm text-zinc-500">{event.club.name + ' • $' + amountLabel}</p>
          </div>
          <button className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-white/10" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Payment Section */}
        <div className="mt-5">
          <div className="text-sm text-zinc-500 mb-2">{`Checkout • $${amountLabel}`}</div>
          <div className="rounded-xl border border-black/10 dark:border-white/10 p-4 flex flex-col gap-3 items-center">
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-xl p-2 bg-indigo-600/10 text-indigo-600">
                <CreditCard size={24} />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium">Pay with Stripe</div>
                <div className="text-xs text-zinc-500">Secure card payment</div>
              </div>
            </div>
            
            <button
              onClick={createStripeSession}
              disabled={processing}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {processing ? "Redirecting…" : `Pay $${amountLabel}`}
            </button>

            <div className="w-full opacity-90">
              <div className="text-center text-xs text-zinc-400 mb-2">Payment will complete on Stripe Checkout</div>
              {processing && <div className="text-xs text-zinc-500 mt-2">Processing payment…</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
