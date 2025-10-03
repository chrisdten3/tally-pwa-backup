"use client";

import { useState } from "react";
import { X, CreditCard, Wallet2, ChevronRight } from "lucide-react";
import { PayPalButtons } from "@paypal/react-paypal-js";

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

export default function PayChoiceModal({ event, authToken, onClose, onPaid }: Props) {
  // choice -> card or venmo
  const [step, setStep] = useState<"choice" | "card" | "venmo">("choice");
  const amount = Number(event.amount || 0);
  const amountLabel = amount.toFixed(2);

  // Reuse your existing order + capture endpoints
  const createOrder = async () => {
    const r = await fetch("/api/paypal/create-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ eventId: event.id }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error || "create-order failed");
    return j.id as string; // orderID
  };

  const onApprove = async (data: any) => {
    const r = await fetch("/api/paypal/capture-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: data.orderID }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error || "capture failed");
    onPaid?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#0b0b0f] border border-black/10 dark:border-white/10 rounded-2xl p-5 max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{event.title}</h2>
            <p className="text-sm text-zinc-500">
              {event.club.name} • ${amountLabel}
            </p>
          </div>
          <button
            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-white/10"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step: Choice */}
        {step === "choice" && (
          <div className="mt-4 space-y-3">
            <button
              onClick={() => setStep("card")}
              className="w-full flex items-center justify-between rounded-xl border border-black/10 dark:border-white/10 bg-transparent px-4 py-3 hover:bg-zinc-50 dark:hover:bg-white/5 transition"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-xl p-2 bg-indigo-600/10 text-indigo-600">
                  <CreditCard size={18} />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium">Pay with card</div>
                  <div className="text-xs text-zinc-500">Secured via PayPal</div>
                </div>
              </div>
              <ChevronRight size={18} className="text-zinc-400" />
            </button>

            <button
              onClick={() => setStep("venmo")}
              className="w-full flex items-center justify-between rounded-xl border border-black/10 dark:border-white/10 bg-transparent px-4 py-3 hover:bg-zinc-50 dark:hover:bg-white/5 transition"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-xl p-2 bg-sky-500/10 text-sky-500">
                  <Wallet2 size={18} />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium">Pay with Venmo</div>
                  <div className="text-xs text-zinc-500">Opens Venmo or QR on desktop</div>
                </div>
              </div>
              <ChevronRight size={18} className="text-zinc-400" />
            </button>
          </div>
        )}

        {/* Step: Card (PayPal Smart Buttons) */}
        {step === "card" && (
          <div className="mt-5">
            <div className="text-sm text-zinc-500 mb-2">Checkout • ${amountLabel}</div>
            <div className="rounded-xl border border-black/10 dark:border-white/10 p-3 flex justify-center">
              <PayPalButtons
                style={{ layout: "vertical", shape: "pill" }}
                createOrder={createOrder}
                onApprove={onApprove}
                onError={(e) => console.error(e)}
              />
            </div>
            <button
              onClick={() => setStep("choice")}
              className="mt-3 text-xs text-zinc-500 hover:text-zinc-300"
            >
              ← choose a different method
            </button>
          </div>
        )}

        {/* Step: Venmo (Smart Buttons fundingSource=venmo) */}
        {step === "venmo" && (
          <div className="mt-5">
            <div className="text-sm text-zinc-500 mb-2">Venmo • ${amountLabel}</div>
            <div className="rounded-xl border border-black/10 dark:border-white/10 p-3 flex justify-center">
              <PayPalButtons
                fundingSource="venmo"
                style={{ layout: "vertical", shape: "pill" }}
                createOrder={createOrder}
                onApprove={onApprove}
                onError={(e) => console.error(e)}
              />
            </div>
            <button
              onClick={() => setStep("choice")}
              className="mt-3 text-xs text-zinc-500 hover:text-zinc-300"
            >
              ← choose a different method
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
