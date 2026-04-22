import React, { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface PaymentFormProps {
  onSuccess: () => void;
  amount: number;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ onSuccess, amount }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        console.error('Payment error:', error);
        toast({
          title: 'Payment Failed',
          description: error.message || 'There was an error processing your payment.',
          variant: 'destructive',
        });
        setIsProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log('Payment succeeded:', paymentIntent.id);
        toast({
          title: 'Payment Successful!',
          description: 'Your deposit has been processed.',
        });
        onSuccess();
      }
    } catch (error) {
      console.error('Payment exception:', error);
      toast({
        title: 'Payment Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Payment Details</h3>
          <div className="text-right">
            <p className="text-sm text-gray-600">Deposit Amount</p>
            <p className="text-2xl font-bold text-[#FF8CAA]">${amount.toFixed(2)}</p>
          </div>
        </div>
        
        <PaymentElement />
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          🔒 <strong>Secure Payment</strong> - Your payment information is encrypted and secure.
        </p>
      </div>

      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-[#FF8CAA] hover:bg-[#FF6B96] text-white font-semibold shadow-lg hover:shadow-xl transition-all"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Processing Payment...
          </>
        ) : (
          <>
            Pay ${amount.toFixed(2)} Deposit
          </>
        )}
      </Button>

      <p className="text-center text-sm text-gray-500">
        You will pay the remaining balance at your appointment
      </p>
    </form>
  );
};

export default PaymentForm;
