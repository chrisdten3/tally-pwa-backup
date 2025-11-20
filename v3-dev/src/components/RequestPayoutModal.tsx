"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, DollarSign, AlertCircle, Loader2 } from "lucide-react";

type RequestPayoutModalProps = {
  isOpen: boolean;
  onClose: () => void;
  clubId: string;
  clubName: string;
  availableBalance: number;
  onSuccess?: () => void;
};

export default function RequestPayoutModal({
  isOpen,
  onClose,
  clubId,
  clubName,
  availableBalance,
  onSuccess,
}: RequestPayoutModalProps) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [payoutDetails, setPayoutDetails] = useState<{
    requestedAmount: number;
    platformFee: number;
    netPayoutAmount: number;
    needsPhoneNumber: boolean;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setTimeout(() => {
        setAmount("");
        setError("");
        setSuccess(false);
        setPayoutDetails(null);
      }, 200);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const calculateFee = (amt: number) => {
    const platformFeePercent = 0.055; // 5.5%
    const platformFeeFixed = 0.30; // $0.30
    const fee = amt * platformFeePercent + platformFeeFixed;
    const net = amt - fee;
    return { fee: Number(fee.toFixed(2)), net: Number(net.toFixed(2)) };
  };

  const amountNum = parseFloat(amount) || 0;
  const { fee, net } = calculateFee(amountNum);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      setError("Please enter a valid amount");
      setLoading(false);
      return;
    }

    if (amountValue > availableBalance) {
      setError(`Amount exceeds available balance ($${availableBalance.toFixed(2)})`);
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      // Get current user to find their user ID and stripe_account_id
      const userRes = await fetch("/api/auth/user", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userData = await userRes.json();

      if (!userData.user) {
        setError("Could not fetch user data");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/stripe/payout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clubId,
          userId: userData.user.id,
          amount: amountValue,
          description: `Payout from ${clubName}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || data.details || "Failed to create payout");
        setLoading(false);
        return;
      }

      if (data.ok && data.payout) {
        setSuccess(true);
        setPayoutDetails({
          requestedAmount: data.payout.requestedAmount,
          platformFee: data.payout.platformFee,
          netPayoutAmount: data.payout.netPayoutAmount,
          needsPhoneNumber: data.payout.needsPhoneNumber || false,
        });

        // Call success callback to refresh data
        if (onSuccess) {
          onSuccess();
        }

        // Auto-close after 3 seconds
        setTimeout(() => {
          onClose();
        }, 3000);
      }
    } catch (err) {
      console.error("Payout error:", err);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-lg border border-border/70 bg-card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        {success ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
              <DollarSign className="h-6 w-6 text-emerald-400" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">Payout Initiated!</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Your payout has been successfully initiated.
            </p>

            {payoutDetails && (
              <div className="mb-4 space-y-2 rounded-lg border border-border/50 bg-muted/30 p-4 text-left">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Requested:</span>
                  <span className="font-medium">${payoutDetails.requestedAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Platform Fee:</span>
                  <span className="font-medium text-red-400">-${payoutDetails.platformFee.toFixed(2)}</span>
                </div>
                <div className="border-t border-border/30 pt-2">
                  <div className="flex justify-between">
                    <span className="font-semibold">You&apos;ll Receive:</span>
                    <span className="font-semibold text-emerald-400">${payoutDetails.netPayoutAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {payoutDetails?.needsPhoneNumber && (
              <div className="mb-4 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
                <div className="flex gap-2">
                  <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
                  <p className="text-xs text-muted-foreground">
                    Add your phone number in settings to receive SMS notifications when this payout settles.
                  </p>
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              You&apos;ll receive an SMS when the payout settles in your bank account.
            </p>
          </div>
        ) : (
          <>
            <h2 className="mb-4 text-xl font-semibold">Request Payout</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Payout Amount
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={availableBalance}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={loading}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Available: ${availableBalance.toFixed(2)}
                </p>
              </div>

              {amountNum > 0 && (
                <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-sm">
                  <div className="mb-2 flex justify-between">
                    <span className="text-muted-foreground">Requested Amount:</span>
                    <span className="font-medium">${amountNum.toFixed(2)}</span>
                  </div>
                  <div className="mb-2 flex justify-between">
                    <span className="text-muted-foreground">Platform Fee (5.5% + $0.30):</span>
                    <span className="font-medium text-red-400">-${fee.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-border/30 pt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold">You&apos;ll Receive:</span>
                      <span className="font-semibold text-emerald-400">${net.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-blue-500/50 bg-blue-500/10 p-3">
                <p className="text-xs text-muted-foreground">
                  Payouts typically arrive in your bank account within minutes to a few hours. You&apos;ll receive an SMS notification when it settles.
                </p>
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !amount || amountNum <= 0}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>Request ${amountNum > 0 ? net.toFixed(2) : "0.00"}</>
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
