"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Copy, QrCode, Share2, Check } from "lucide-react";

type EventShareLinkProps = {
  eventId: string;
  eventTitle: string;
};

export function EventShareLink({ eventId, eventTitle }: EventShareLinkProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const shareUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/events/${eventId}/pay`
    : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: eventTitle,
          text: `Pay for: ${eventTitle}`,
          url: shareUrl,
        });
      } catch (err) {
        console.error("Failed to share:", err);
      }
    } else {
      handleCopy();
    }
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareUrl)}`;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Share2 className="h-4 w-4" />
        Share Link
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Event Payment Link</DialogTitle>
            <DialogDescription>
              Anyone with this link can pay for this event and will be automatically added to the club.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Link Input and Copy */}
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={shareUrl}
                className="flex-1"
                onClick={(e) => e.currentTarget.select()}
              />
              <Button
                size="icon"
                variant="outline"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => setShowQR(!showQR)}
              >
                <QrCode className="h-4 w-4" />
                {showQR ? "Hide" : "Show"} QR Code
              </Button>
            </div>

            {/* QR Code Display */}
            {showQR && (
              <div className="flex flex-col items-center gap-3 p-4 bg-muted rounded-lg">
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  className="w-64 h-64 border-4 border-white rounded-lg shadow-sm"
                />
                <p className="text-sm text-muted-foreground text-center">
                  Scan this QR code to pay for the event
                </p>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>How it works:</strong> Users can scan the QR code or click the link, enter their name and phone number, and pay. They'll be automatically added to your club!
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
