import { useState } from 'react';
import { Button } from '../components/ui/button';

export default function SimpleEmailTest() {
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const testDirectFetch = async () => {
    setIsLoading(true);
    setResult('Testing direct function call...\n');

    try {
      const response = await fetch(
        'https://welrezlcsksigrqwfcme.supabase.co/functions/v1/send-email',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            to: 'brianalehota@gmail.com',
            subject: 'Direct Test Email',
            html: `
              <h1>Direct Function Test</h1>
              <p>Testing direct function call at ${new Date().toISOString()}</p>
            `
          })
        }
      );

      const responseText = await response.text();
      
      setResult(`Response Status: ${response.status}\nResponse Text:\n${responseText}\n\nHeaders:\n${Array.from(response.headers.entries()).map(([k,v]) => `${k}: ${v}`).join('\n')}`);
      
    } catch (err) {
      setResult(`❌ Direct fetch failed: ${err.message}\n\nThis confirms the function has deployment issues.`);
    } finally {
      setIsLoading(false);
    }
  };

  const testFunctionExists = async () => {
    setIsLoading(true);
    setResult('Checking if function exists...\n');

    try {
      const response = await fetch(
        'https://welrezlcsksigrqwfcme.supabase.co/functions/v1/send-email',
        { 
          method: 'OPTIONS',
          headers: {
            'Origin': window.location.origin
          }
        }
      );

      if (response.status === 200 || response.status === 204) {
        setResult('✅ Function exists and responds to OPTIONS\nTrying POST request...');
        setTimeout(testDirectFetch, 1000);
      } else {
        setResult(`❌ Function doesn't exist or has issues\nStatus: ${response.status}\nThis means deployment failed.`);
      }
    } catch (err) {
      setResult(`❌ Cannot reach function: ${err.message}\nCheck your internet connection.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-pink-50 p-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-red-600">🔧 Email Function Debug</h1>
        
        <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
          <h3 className="font-semibold text-red-800 mb-2">📋 Steps to Fix</h3>
          <ol className="text-sm text-red-700 space-y-2">
            <li><strong>1. Apply Database Schema:</strong>
              <br/>Go to <a href="https://supabase.com/dashboard/project/welrezlcsksigrqwfcme/sql" target="_blank" className="underline">Supabase SQL Editor</a>
              <br/>Copy-paste COMPLETE_DATABASE_SETUP.sql and run it
            </li>
            <li><strong>2. Test Function Status:</strong> Use buttons below</li>
            <li><strong>3. Check Logs:</strong> <a href="https://supabase.com/dashboard/project/welrezlcsksigrqwfcme/functions" target="_blank" className="underline">Function Dashboard</a></li>
          </ol>
        </div>
        
        <div className="space-y-4">
          <Button 
            onClick={testFunctionExists} 
            disabled={isLoading}
            className="w-full bg-blue-500 hover:bg-blue-600"
          >
            {isLoading ? 'Testing...' : '🔍 Check Function Status'}
          </Button>

          <Button 
            onClick={testDirectFetch} 
            disabled={isLoading}
            className="w-full bg-orange-500 hover:bg-orange-600"
          >
            {isLoading ? 'Testing...' : '📧 Test Direct Email Call'}
          </Button>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Debug Output:</h3>
          <div className="bg-gray-100 p-4 rounded-lg min-h-[200px] whitespace-pre-wrap font-mono text-xs overflow-auto">
            {result || 'Click a button above to start debugging...'}
          </div>
        </div>
      </div>
    </div>
  );
}