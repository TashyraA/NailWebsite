import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAppointments } from '@/services/appointmentService';
import { getServices } from '@/services/serviceSupabase';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, DollarSign, Users, TrendingUp, RefreshCw } from 'lucide-react';
import { formatTime12Hour } from '@/utils/dateTime';

const AdminDashboard = () => {
  const queryClient = useQueryClient();
  
  const { data: appointments = [], error: appointmentsError, isLoading: appointmentsLoading, refetch: refetchAppointments } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => getAppointments(),
    staleTime: 0, // Force fresh data
    refetchOnWindowFocus: false,
  });

  const { data: services = [], error: servicesError, isLoading: servicesLoading, refetch: refetchServices } = useQuery({
    queryKey: ['services'],
    queryFn: () => getServices(),
    staleTime: 0, // Force fresh data  
    refetchOnWindowFocus: false,
  });

  // Manual refresh function
  const handleRefresh = () => {
    console.log('Manual refresh triggered');
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
    queryClient.invalidateQueries({ queryKey: ['services'] });
    refetchAppointments();
    refetchServices();
  };

  // Debug logging with more detail
  console.log('Dashboard - appointments data:', appointments);
  console.log('Dashboard - appointments count:', appointments?.length);
  console.log('Dashboard - appointments error:', appointmentsError);
  console.log('Dashboard - appointments loading:', appointmentsLoading);
  console.log('Dashboard - services data:', services);
  console.log('Dashboard - services count:', services?.length);
  console.log('Dashboard - services error:', servicesError);

  // Only calculate stats when data is available to prevent flickering
  const stats = React.useMemo(() => {
    console.log('Stats calculation - appointments:', appointments, 'loading:', appointmentsLoading);
    
    if (appointmentsLoading) {
      // Return loading placeholders
      return [
        { title: 'Total Revenue', value: 'Loading...', icon: DollarSign, color: 'from-green-400 to-green-600' },
        { title: 'Upcoming Appointments', value: 'Loading...', icon: Calendar, color: 'from-blue-400 to-blue-600' },
        { title: 'Active Services', value: 'Loading...', icon: TrendingUp, color: 'from-pink-400 to-pink-600' },
        { title: 'Total Bookings', value: 'Loading...', icon: Users, color: 'from-pink-400 to-pink-600' }
      ];
    }

    if (appointmentsError) {
      console.error('Appointments error in stats:', appointmentsError);
      return [
        { title: 'Total Revenue', value: 'Error', icon: DollarSign, color: 'from-red-400 to-red-600' },
        { title: 'Upcoming Appointments', value: 'Error', icon: Calendar, color: 'from-red-400 to-red-600' },
        { title: 'Active Services', value: services?.length || 0, icon: TrendingUp, color: 'from-pink-400 to-pink-600' },
        { title: 'Total Bookings', value: 'Error', icon: Users, color: 'from-red-400 to-red-600' }
      ];
    }

    // Total revenue = all deposits paid + full payments when balance is $0
    // This accounts for customers who have paid in full vs those who only paid deposits
    const totalRevenue = appointments?.reduce((sum, apt) => {
      console.log('Revenue calculation - apt:', apt, 'depositPaid:', apt.depositPaid, 'balanceDue:', apt.balanceDue, 'totalPrice:', apt.totalPrice, 'status:', apt.status);
      // Include revenue from all non-cancelled appointments
      if (apt.status !== 'cancelled') {
        // If balance due is 0 or very small (< 0.01), customer has paid in full
        if (apt.balanceDue <= 0.01) {
          return sum + (apt.totalPrice || 0); // Count full payment
        } else {
          return sum + (apt.depositPaid || 0); // Count only deposit
        }
      }
      return sum;
    }, 0) || 0;
    
    // Upcoming appointments = pending + confirmed (not cancelled or completed)
    const upcomingAppointments = appointments?.filter(apt => 
      apt.status === 'pending' || apt.status === 'confirmed'
    ).length || 0;
    
    // Total bookings = all appointments except cancelled
    const totalBookings = appointments?.filter(apt => apt.status !== 'cancelled').length || 0;
    
    const activeServices = services?.length || 0;

    console.log('Final stats calculated:', { totalRevenue, upcomingAppointments, totalBookings, activeServices });

    return [
      {
        title: 'Total Revenue',
        value: `$${totalRevenue.toFixed(2)}`,
        icon: DollarSign,
        color: 'from-green-400 to-green-600'
      },
      {
        title: 'Upcoming Appointments',
        value: upcomingAppointments,
        icon: Calendar,
        color: 'from-blue-400 to-blue-600'
      },
      {
        title: 'Active Services',
        value: activeServices,
        icon: TrendingUp,
        color: 'from-pink-400 to-pink-600'
      },
      {
        title: 'Total Bookings',
        value: totalBookings,
        icon: Users,
        color: 'from-pink-400 to-pink-600'
      }
    ];
  }, [appointments, services, appointmentsLoading, appointmentsError]);

  return (
    <AdminLayout>
      <div>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Dashboard Overview</h1>
          <button
            onClick={handleRefresh}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            disabled={appointmentsLoading || servicesLoading}
          >
            <RefreshCw className={`h-4 w-4 ${appointmentsLoading || servicesLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>
        </div>

        {(appointmentsLoading || servicesLoading) && (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading dashboard data...</p>
          </div>
        )}

        {appointmentsError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">Error loading appointments: {appointmentsError.message}</p>
          </div>
        )}

        {servicesError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">Error loading services: {servicesError.message}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
                </div>
                <div className={`bg-gradient-to-br ${stat.color} p-3 rounded-xl`}>
                  <stat.icon className="text-white" size={24} />
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Recent Appointments</h2>
            {appointmentsLoading && (
              <p className="text-gray-500 text-center py-4">Loading appointments...</p>
            )}
            {appointmentsError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-700 text-sm">Error: {appointmentsError.message}</p>
              </div>
            )}
            <div className="space-y-3">
              {!appointmentsLoading && (!appointments || appointments.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <p className="mb-2">No appointments found</p>
                  <p className="text-sm">Appointments will appear here once created</p>
                  <p className="text-xs text-gray-400 mt-2">Debug: appointments array length = {appointments?.length || 0}</p>
                </div>
              )}
              {appointments && appointments.length > 0 && appointments.slice(0, 5).map(apt => (
                <div key={apt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">{apt.customerName || 'N/A'}</p>
                    <p className="text-sm text-gray-600">
                      {apt.appointmentDate || 'N/A'} at {apt.appointmentTime ? formatTime12Hour(apt.appointmentTime) : 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Total: ${apt.totalPrice || 0} | Deposit: ${apt.depositPaid || 0} | Balance: ${apt.balanceDue || 0}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      apt.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                      apt.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      apt.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {apt.status}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">ID: {apt.id}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Services Overview</h2>
            <div className="space-y-3">
              {!servicesLoading && services && services.length > 0 ? (
                services.slice(0, 5).map(service => (
                  <div key={service.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800">{service.title}</p>
                      <p className="text-sm text-gray-600">{service.category}</p>
                    </div>
                    <span className="font-bold text-pink-600">${service.price}</span>
                  </div>
                ))
              ) : !servicesLoading ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="mb-2">No services found</p>
                  <p className="text-sm">Add services to get started</p>
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
