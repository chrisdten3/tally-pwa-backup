"use client";
import React from "react";
import { CreditCard } from "lucide-react";

export default function PaymentsPage() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-700/20 text-indigo-300 flex items-center justify-center">
          <CreditCard size={28} />
        </div>
        <h1 className="mt-4 text-2xl font-semibold">Payments</h1>
        <p className="mt-2 text-sm text-zinc-500">Coming soon. Manage cards, view transactions, and settle balances.</p>
      </div>
    </main>
  );
}


