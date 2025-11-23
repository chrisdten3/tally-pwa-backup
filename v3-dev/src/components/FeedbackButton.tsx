"use client";
import React, { useState } from "react";
import { MessageSquare } from "lucide-react";
import FeedbackModal from "./FeedbackModal";

export default function FeedbackButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-bright-indigo text-white shadow-lg transition hover:scale-105 hover:shadow-xl hover:shadow-bright-indigo/30 md:h-auto md:w-auto md:gap-2 md:rounded-xl md:px-4 md:py-3"
        aria-label="Send feedback"
      >
        <MessageSquare size={20} />
        <span className="hidden md:inline text-sm font-medium">Feedback</span>
      </button>
      
      <FeedbackModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}
