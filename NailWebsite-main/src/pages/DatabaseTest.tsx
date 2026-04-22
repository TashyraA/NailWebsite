import React, { useState, useEffect } from 'react';
import { getAppointments } from '@/services/appointmentService';
import { getServices } from '@/services/servicesData';
import DatabaseConnectionTest from '@/components/DatabaseConnectionTest';
import QuickDatabaseTest from '@/components/QuickDatabaseTest';

const DatabaseTest = () => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('DatabaseTest: Starting data fetch...');
      
      // Test appointments
      const appointmentsData = await getAppointments();
      console.log('DatabaseTest: Appointments result:', appointmentsData);
      setAppointments(appointmentsData || []);

      // Test services  
      const servicesData = await getServices();
      console.log('DatabaseTest: Services result:', servicesData);
      setServices(servicesData || []);

      setLoading(false);
    } catch (err: any) {
      console.error('DatabaseTest: Error fetching data:', err);
      setError(err.message || 'Unknown error');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Database Test Page</h1>
        <p>Loading data...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Database Test Page</h1>
      
      {/* Connection Test Component */}
      <DatabaseConnectionTest />
      
      {/* Quick Test Component */}
      <QuickDatabaseTest />
      
      <div className="mt-8">
        <button 
          onClick={fetchData}
          className="mb-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh Data
        </button>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Appointments Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Appointments ({appointments.length})
          </h2>
          
          <div className="bg-gray-100 p-4 rounded mb-4">
            <h3 className="font-medium mb-2">Raw Data Structure:</h3>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(appointments.slice(0, 1), null, 2)}
            </pre>
          </div>

          <div className="space-y-3">
            {appointments.length === 0 ? (
              <p className="text-gray-500">No appointments found</p>
            ) : (
              appointments.map((apt, index) => (
                <div key={apt.id || index} className="bg-white border rounded p-3">
                  <div className="font-medium">
                    {apt.customerName || 'No name'} - {apt.status || 'No status'}
                  </div>
                  <div className="text-sm text-gray-600">
                    Date: {apt.appointmentDate || 'No date'} | 
                    Time: {apt.appointmentTime || 'No time'}
                  </div>
                  <div className="text-sm text-gray-600">
                    Total: ${apt.totalPrice || 0} | 
                    Deposit: ${apt.depositPaid || 0} | 
                    Balance: ${apt.balanceDue || 0}
                  </div>
                  <div className="text-xs text-gray-400">
                    ID: {apt.id || 'No ID'} | Created: {apt.createdAt || 'No date'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Services Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Services ({services.length})
          </h2>
          
          <div className="bg-gray-100 p-4 rounded mb-4">
            <h3 className="font-medium mb-2">Raw Data Structure:</h3>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(services.slice(0, 1), null, 2)}
            </pre>
          </div>

          <div className="space-y-3">
            {services.length === 0 ? (
              <p className="text-gray-500">No services found</p>
            ) : (
              services.map((service, index) => (
                <div key={service.id || index} className="bg-white border rounded p-3">
                  <div className="font-medium">
                    {service.title || 'No title'} - ${service.price || 0}
                  </div>
                  <div className="text-sm text-gray-600">
                    Category: {service.category || 'No category'}
                  </div>
                  <div className="text-xs text-gray-400">
                    ID: {service.id || 'No ID'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default DatabaseTest;