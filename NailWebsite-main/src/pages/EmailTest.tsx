import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

export default function EmailTest() {
  const [sessionId, setSessionId] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const testBalancePaymentEmails = async () => {
    if (!sessionId) {
      setResult('Please enter a session ID');
      return;
    }

    setIsLoading(true);
    setResult(`Testing balance payment emails with session: ${sessionId}...\n`);

    try {
      console.log('Testing balance payment emails...', sessionId);
      
      const { data, error } = await supabase.functions.invoke('send-balance-payment-emails', {
        body: {
          sessionId: sessionId
        }
      });

      console.log('Response:', { data, error });

      if (error) {
        let errorMessage = `❌ Error:\n${JSON.stringify(error, null, 2)}\n`;
        
        if (error.message?.includes('Not a balance payment session')) {
          errorMessage += '\n💡 This is expected for mock session IDs.\nTry with a real Stripe session ID from a balance payment.';
        } else {
          errorMessage += '\nTroubleshooting:\n1. Check Supabase Function Logs\n2. Verify the session ID is valid\n3. Ensure database has balance payment tracking fields';
        }
        
        setResult(errorMessage);
      } else {
        setResult(`✅ Success:\n${JSON.stringify(data, null, 2)}\n\n📧 Check email inboxes for confirmation emails!`);
      }
    } catch (err) {
      console.error('Test error:', err);
      setResult(`❌ Exception: ${err.message}\n\nThis might be a network timeout or function startup delay.\nWait 30 seconds and try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const testSendEmail = async () => {
    setIsLoading(true);
    setResult('Testing send-email function...\n');

    try {
      console.log('Testing send-email function...');
      
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: 'brianalehota@gmail.com',
          subject: 'Test Email - Balance Payment System',
          html: `
            <h1>Test Email</h1>
            <p>This is a test email to verify that the send-email function is working.</p>
            <p>Timestamp: ${new Date().toISOString()}</p>
          `
        }
      });

      console.log('Send email response:', { data, error });
      
      if (error) {
        setResult(`❌ Send-email Error:\n${JSON.stringify(error, null, 2)}\n\nTroubleshooting:\n1. Check Supabase Function Logs\n2. Verify RESEND_API_KEY is set\n3. Try refreshing and testing again`);
      } else {
        setResult(`✅ Send-email Success:\n${JSON.stringify(data, null, 2)}`);
      }
    } catch (err) {
      console.error('Send email test error:', err);
      setResult(`❌ Send-email Exception: ${err.message}\n\nThis might be a network timeout. Try:\n1. Refreshing the page\n2. Checking your internet connection\n3. Waiting 30 seconds and trying again`);
    } finally {
      setIsLoading(false);
    }
  };

  const testBasicConnectivity = async () => {
    setIsLoading(true);
    setResult('Testing basic function connectivity...\n');

    try {
      // Test with a simple request that should get a CORS response
      const response = await fetch(
        'https://welrezlcsksigrqwfcme.supabase.co/functions/v1/send-email',
        {
          method: 'OPTIONS',
          headers: {
            'Origin': window.location.origin,
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type,Authorization'
          }
        }
      );

      if (response.ok) {
        setResult('✅ Basic connectivity working! Functions are reachable.\nNow try the email tests above.');
      } else {
        setResult(`❌ Connectivity issue: ${response.status} ${response.statusText}\n\nThe functions might be having deployment issues.`);
      }
    } catch (err) {
      setResult(`❌ Network Error: ${err.message}\n\nCheck your internet connection.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-pink-50 p-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-purple-600">Email Function Test</h1>
        
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">📋 Testing Instructions</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>1. Test connectivity first if getting fetch errors</li>
            <li>2. Test send-email function to verify basic email delivery</li>
            <li>3. Test balance payment emails with mock or real session ID</li>
            <li>4. Check browser console for detailed error messages</li>
            <li>5. Monitor <a href="https://supabase.com/dashboard/project/welrezlcsksigrqwfcme/functions" target="_blank" className="underline">Supabase Function Logs</a></li>
          </ul>
        </div>
        
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-3">Test Basic Connectivity</h2>
            <Button 
              onClick={testBasicConnectivity} 
              disabled={isLoading}
              className="w-full bg-blue-500 hover:bg-blue-600"
            >
              {isLoading ? 'Testing...' : 'Test Function Connectivity'}
            </Button>
            <p className="text-sm text-gray-600 mt-2">Start here if getting fetch errors</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3">Test Send-Email Function</h2>
            <Button 
              onClick={testSendEmail} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Testing...' : 'Test Send Email'}
            </Button>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3">Test Balance Payment Emails</h2>
            <div className="space-y-3">
              <Input
                placeholder="Enter Stripe session ID (or 'cs_test_mock' for testing)"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
              />
              <Button 
                onClick={testBalancePaymentEmails} 
                disabled={isLoading || !sessionId}
                className="w-full"
              >
                {isLoading ? 'Testing...' : 'Test Balance Payment Emails'}
              </Button>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Result:</h3>
            <div className="bg-gray-100 p-4 rounded-lg min-h-[100px] whitespace-pre-wrap font-mono text-sm">
              {result || 'No test run yet...'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}