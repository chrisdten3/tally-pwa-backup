/**
 * Example: Payout Button Component
 * 
 * This is a reference implementation showing how to trigger a payout from your UI.
 * You can integrate this into your club management pages.
 */

import { useState } from "react";
import Button from "@/components/Button";

interface PayoutButtonProps {
  clubId: string;
  userId: string;
  amount: number;
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
}

export default function PayoutButton({
  clubId,
  userId,
  amount,
  onSuccess,
  onError,
}: PayoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePayout = async () => {
    if (!confirm(`Send $${amount.toFixed(2)} payout?`)) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Not authenticated");
      }

      const res = await fetch("/api/stripe/payout", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clubId,
          userId,
          amount,
          description: `Payout of $${amount.toFixed(2)}`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.details || "Payout failed");
      }

      alert(`Payout sent successfully! New balance: $${data.payout.newClubBalance.toFixed(2)}`);
      onSuccess?.(data);
    } catch (err: any) {
      const errorMsg = err.message || "Failed to send payout";
      alert(`Error: ${errorMsg}`);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePayout}
      disabled={loading || amount <= 0}
      variant="primary"
    >
      {loading ? "Processing..." : `Send $${amount.toFixed(2)} Payout`}
    </Button>
  );
}

// Example usage in a page:
/*
import PayoutButton from "@/components/PayoutButton";

function ClubAdminPage() {
  const clubId = "club-123";
  const recipientUserId = "user-456";
  const payoutAmount = 50.00;

  return (
    <div>
      <h1>Club Payouts</h1>
      <PayoutButton
        clubId={clubId}
        userId={recipientUserId}
        amount={payoutAmount}
        onSuccess={(result) => {
          console.log("Payout successful:", result);
          // Refresh balance, update UI, etc.
        }}
        onError={(error) => {
          console.error("Payout failed:", error);
        }}
      />
    </div>
  );
}
*/
