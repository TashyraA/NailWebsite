import { useState } from 'react';
import { supabase } from '../lib/supabase';

const DatabaseConnectionTest = () => {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    try {
      console.log('Testing Supabase connection...');
      
      // Test 1: Check if we can access the database at all
      const { data: testData, error: testError } = await supabase
        .from('appointments')
        .select('count', { count: 'exact', head: true });
      
      console.log('Test 1 - Count appointments:', { testData, testError });

      if (testError) {
        setResult({ error: 'Connection failed', details: testError });
        setLoading(false);
        return;
      }

      // Test 2: Try to get actual appointment data
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .limit(5);

      console.log('Test 2 - Get appointments:', { appointments, appointmentsError });

      // Test 3: Try to get services data
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .limit(5);

      console.log('Test 3 - Get services:', { services, servicesError });

      setResult({
        appointmentsCount: testData,
        appointments,
        appointmentsError,
        services,
        servicesError,
        timestamp: new Date().toLocaleTimeString()
      });

    } catch (error) {
      console.error('Connection test failed:', error);
      setResult({ error: 'Connection failed', details: error });
    }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Database Connection Test</h1>
      
      <button
        onClick={testConnection}
        disabled={loading}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
      >
        {loading ? 'Testing...' : 'Test Database Connection'}
      </button>

      {result && (
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Test Results ({result.timestamp}):</h2>
          <pre className="text-sm overflow-auto whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default DatabaseConnectionTest;