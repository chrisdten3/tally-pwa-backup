"use client";
import React, { useState } from "react";
import { X, Bug, Lightbulb, Send } from "lucide-react";

type FeedbackType = "bug" | "suggestion";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("suggestion");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          type: feedbackType,
          title,
          description,
          email,
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      });

      if (response.ok) {
        setSubmitted(true);
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        alert("Failed to submit feedback. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
      alert("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setEmail("");
    setSubmitted(false);
    setFeedbackType("suggestion");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 p-6">
          <h2 className="text-2xl font-bold text-white">
            {submitted ? "Thank You!" : "Share Your Feedback"}
          </h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {submitted ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
                <Send size={32} className="text-green-500" />
              </div>
              <p className="text-lg text-zinc-300">
                Your feedback has been submitted successfully!
              </p>
              <p className="mt-2 text-sm text-zinc-500">
                We appreciate your help in making Tally better.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Feedback Type Selection */}
              <div>
                <label className="mb-3 block text-sm font-medium text-zinc-300">
                  What would you like to share?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFeedbackType("suggestion")}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-4 transition ${
                      feedbackType === "suggestion"
                        ? "border-bright-indigo bg-bright-indigo/10 text-bright-indigo"
                        : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <Lightbulb size={20} />
                    <span className="font-medium">Suggestion</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedbackType("bug")}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-4 transition ${
                      feedbackType === "bug"
                        ? "border-red-500 bg-red-500/10 text-red-500"
                        : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <Bug size={20} />
                    <span className="font-medium">Bug Report</span>
                  </button>
                </div>
              </div>

              {/* Title */}
              <div>
                <label htmlFor="title" className="mb-2 block text-sm font-medium text-zinc-300">
                  {feedbackType === "bug" ? "What went wrong?" : "What's your idea?"}
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    feedbackType === "bug"
                      ? "e.g., Payment button doesn't work"
                      : "e.g., Add dark mode toggle"
                  }
                  required
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-white placeholder-zinc-500 transition focus:border-bright-indigo focus:outline-none focus:ring-2 focus:ring-bright-indigo/20"
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="mb-2 block text-sm font-medium text-zinc-300">
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    feedbackType === "bug"
                      ? "Please describe what happened, what you expected, and any steps to reproduce..."
                      : "Tell us more about your suggestion and how it would help..."
                  }
                  required
                  rows={5}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-white placeholder-zinc-500 transition focus:border-bright-indigo focus:outline-none focus:ring-2 focus:ring-bright-indigo/20 resize-none"
                />
              </div>

              {/* Email (optional) */}
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-zinc-300">
                  Email <span className="text-zinc-500">(optional)</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-white placeholder-zinc-500 transition focus:border-bright-indigo focus:outline-none focus:ring-2 focus:ring-bright-indigo/20"
                />
                <p className="mt-1.5 text-xs text-zinc-500">
                  We&apos;ll only use this to follow up on your feedback
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/50 px-6 py-3 font-medium text-zinc-300 transition hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 rounded-xl px-6 py-3 font-medium text-white transition ${
                    feedbackType === "bug"
                      ? "bg-red-500 hover:bg-red-600"
                      : "bg-bright-indigo hover:bg-[#6C57FF]"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isSubmitting ? "Submitting..." : "Submit Feedback"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Note */}
        {!submitted && (
          <div className="border-t border-zinc-800 bg-zinc-900/30 px-6 py-4">
            <p className="text-center text-xs text-zinc-500">
              🚧 Tally is in active development. Your feedback helps us build something great!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
