import { useState } from 'react';
import { supabase } from '@/lib/supabase';

const QuickDatabaseTest = () => {
  const [testResults, setTestResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    const results: any = {};

    try {
      console.log('🔍 Starting comprehensive database tests...');
      
      // Test 1: Check Supabase connection
      console.log('Test 1: Checking Supabase connection...');
      results.connectionTest = { status: 'Testing...', timestamp: new Date().toISOString() };
      setTestResults({...results});

      // Test 2: Check appointments table
      console.log('Test 2: Checking appointments table...');
      const { data: appointmentsRaw, error: appointmentsError, count: appointmentsCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact' });

      results.appointmentsTest = {
        success: !appointmentsError,
        error: appointmentsError,
        count: appointmentsCount,
        sampleData: appointmentsRaw?.slice(0, 3) || [],
        timestamp: new Date().toISOString()
      };
      
      console.log('Appointments test result:', results.appointmentsTest);
      setTestResults({...results});

      // Test 3: Check services table  
      console.log('Test 3: Checking services table...');
      const { data: servicesRaw, error: servicesError, count: servicesCount } = await supabase
        .from('services')
        .select('*', { count: 'exact' });

      results.servicesTest = {
        success: !servicesError,
        error: servicesError,
        count: servicesCount,
        sampleData: servicesRaw?.slice(0, 3) || [],
        timestamp: new Date().toISOString()
      };
      
      console.log('Services test result:', results.servicesTest);
      setTestResults({...results});

      // Test 4: Check user authentication status
      console.log('Test 4: Checking user authentication...');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      results.authTest = {
        success: !authError,
        error: authError,
        user: user ? { id: user.id, email: user.email } : null,
        timestamp: new Date().toISOString()
      };
      
      console.log('Auth test result:', results.authTest);
      setTestResults({...results});

      // Test 5: Try to insert a test record (and then delete it)
      console.log('Test 5: Testing insert permissions...');
      const testRecord = {
        customer_name: 'Test Customer - DELETE ME',
        customer_email: 'test@example.com',
        customer_phone: '123-456-7890',
        appointment_date: '2025-12-31',
        appointment_time: '09:00',
        services: [{ name: 'Test Service' }],
        total_price: 100,
        deposit_paid: 50,
        balance_due: 50,
        status: 'pending'
      };

      const { data: insertData, error: insertError } = await supabase
        .from('appointments')
        .insert([testRecord])
        .select()
        .single();

      if (insertData) {
        // Clean up - delete the test record
        await supabase
          .from('appointments')
          .delete()
          .eq('id', insertData.id);
      }

      results.insertTest = {
        success: !insertError && !!insertData,
        error: insertError,
        insertedId: insertData?.id,
        timestamp: new Date().toISOString()
      };
      
      console.log('Insert test result:', results.insertTest);
      setTestResults({...results});

      results.connectionTest = { status: 'All tests completed', timestamp: new Date().toISOString() };
      setTestResults({...results});
      
      console.log('🎉 All database tests completed!', results);

    } catch (error) {
      console.error('❌ Database test failed:', error);
      results.globalError = { error, timestamp: new Date().toISOString() };
      setTestResults({...results});
    }
    
    setLoading(false);
  };

  return (
    <div className="p-6 bg-white border rounded-lg">
      <h2 className="text-xl font-bold mb-4">🔧 Quick Database Tests</h2>
      
      <button
        onClick={runTests}
        disabled={loading}
        className="mb-4 px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {loading ? '🔄 Running Tests...' : '🚀 Run Database Tests'}
      </button>

      <div className="space-y-4">
        {Object.keys(testResults).map((testName) => (
          <div key={testName} className="border rounded p-3">
            <h3 className="font-semibold text-lg mb-2">
              {testName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
            </h3>
            <div className="bg-gray-100 p-2 rounded">
              <pre className="text-xs overflow-auto whitespace-pre-wrap">
                {JSON.stringify(testResults[testName], null, 2)}
              </pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuickDatabaseTest;