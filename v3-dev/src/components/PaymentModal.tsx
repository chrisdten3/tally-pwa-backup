'use client';

import { X, CreditCard, DollarSign } from 'lucide-react';
import { useState } from 'react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: {
    id: string;
    name: string;
    price: number;
    description?: string;
  };
}

export default function PaymentModal({ isOpen, onClose, event }: PaymentModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  // router not required for Stripe redirect flow

  if (!isOpen) return null;

  const handlePayment = async (paymentMethod: 'card' | 'venmo') => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/stripe/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: event.id }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'create-session failed');
      if (j.url) {
        window.location.href = j.url;
      } else {
        throw new Error('No session URL returned from server');
      }
    } catch (e) {
      console.error('Stripe session creation failed:', e);
      alert((e as any)?.message || 'Payment initiation failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-onyx/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-prussian-blue border border-border rounded-lg w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h2 className="text-xl font-semibold text-soft-white">Payment Options</h2>
          <button 
            onClick={onClose}
            className="text-cool-gray hover:text-soft-white transition-colors"
            disabled={isLoading}
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6">
          <h3 className="text-lg font-medium mb-2 text-soft-white">{event.name}</h3>
          <p className="text-cool-gray mb-6">{event.description || 'No description available'}</p>
          
          <div className="space-y-4">
            <button
              onClick={() => handlePayment('card')}
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 bg-bright-indigo text-white py-3 px-4 rounded-lg hover:bg-bright-indigo/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <CreditCard size={20} />
              <span>Pay with Card</span>
            </button>
            
            <button
              onClick={() => handlePayment('venmo')}
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 bg-mint-leaf text-white py-3 px-4 rounded-lg hover:bg-mint-leaf/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <DollarSign size={20} />
              <span>Pay with Venmo</span>
            </button>
          </div>
          
          <p className="text-sm text-gray-500 mt-4 text-center">
            You'll complete your payment on the next page
          </p>
        </div>
      </div>
    </div>
  );
}
