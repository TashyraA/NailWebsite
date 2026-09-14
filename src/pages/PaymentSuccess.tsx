import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Home, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isBalancePayment, setIsBalancePayment] = useState(false);
  const [isProcessingEmails, setIsProcessingEmails] = useState(false);
  const [emailsProcessed, setEmailsProcessed] = useState(false);

  const handleBalancePaymentSuccess = useCallback(async (sessionId: string | null) => {
    if (!sessionId || emailsProcessed) return;
    
    setEmailsProcessed(true); // Prevent multiple calls
    setIsProcessingEmails(true);
    
    try {
      console.log('Balance payment completed:', sessionId);
      toast({ title: 'Payment complete', description: 'Your payment has been recorded by Stripe.' });
    } catch (error) {
      console.error('Error processing balance payment emails:', error);
      toast({
        title: 'Email Error',
        description: 'Payment completed but there was an issue sending confirmation emails.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessingEmails(false);
    }
  }, [emailsProcessed, toast]);

  useEffect(() => {
    const id = searchParams.get('session_id');
    const type = searchParams.get('type');
    
    if (id) {
      setSessionId(id);
    }
    
    // Check if this is a balance payment
    if (type === 'balance' && id && !emailsProcessed) {
      setIsBalancePayment(true);
      handleBalancePaymentSuccess(id);
    }
    
    console.log('Payment completed with session ID:', id, 'Type:', type);
  }, []); // Empty dependency array - only run once

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="mb-6">
          <CheckCircle className="mx-auto w-16 h-16 text-green-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {isBalancePayment ? 'Balance Payment Complete! 🎉' : 'Payment Successful! 🎉'}
          </h1>
          <p className="text-gray-600">
            {isBalancePayment 
              ? 'Thank you! Your remaining balance has been paid successfully.'
              : 'Thank you! Your payment has been processed successfully.'
            }
          </p>
          {isProcessingEmails && (
            <p className="text-sm text-blue-600 mt-2">Sending confirmation emails...</p>
          )}
        </div>

        {sessionId && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600">
              <strong>Payment ID:</strong> {sessionId.slice(-8)}...
            </p>
          </div>
        )}

        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            You should receive a confirmation email shortly. If you have any questions, 
            please don't hesitate to contact us.
          </p>

          <div className="flex gap-3">
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="flex-1"
            >
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
            <Button
              onClick={() => navigate('/contact')}
              className="flex-1 bg-gradient-to-r from-pink-500 to-pink-700 hover:from-pink-600 hover:to-pink-800"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Book Again
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PaymentSuccess;