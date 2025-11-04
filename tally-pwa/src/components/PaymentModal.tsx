'use client';

import { X, CreditCard, DollarSign } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
  const _router = useRouter();

  if (!isOpen) return null;

  const handlePayment = async (paymentMethod: 'card' | 'venmo') => {
    setIsLoading(true);
    // Redirect to the appropriate payment method
    if (paymentMethod === 'card') {
      // Redirect to PayPal flow
      window.location.href = `/api/checkout?eventId=${event.id}&type=paypal`;
    } else {
      // Redirect to Venmo flow
      window.location.href = `/api/checkout?eventId=${event.id}&type=venmo`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Payment Options</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={isLoading}
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6">
          <h3 className="text-lg font-medium mb-2">{event.name}</h3>
          <p className="text-gray-600 mb-6">{event.description || 'No description available'}</p>
          
          <div className="space-y-4">
            <button
              onClick={() => handlePayment('card')}
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CreditCard size={20} />
              <span>Pay with Card</span>
            </button>
            
            <button
              onClick={() => handlePayment('venmo')}
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 bg-teal-500 text-white py-3 px-4 rounded-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
