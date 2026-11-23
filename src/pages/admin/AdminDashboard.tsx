
import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAppointments } from '@/services/appointmentService';
import { getServices } from '@/services/servicesData';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/card';
import {
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  RefreshCw,
  ClipboardList,
} from 'lucide-react';
import { formatTime12Hour } from '@/utils/dateTime';

const AdminDashboard = () => {
  const queryClient = useQueryClient();

  const {
    data: appointments = [],
    error: appointmentsError,
    isLoading: appointmentsLoading,
    refetch: refetchAppointments,
  } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => getAppointments(),
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const {
    data: services = [],
    error: servicesError,
    isLoading: servicesLoading,
    refetch: refetchServices,
  } = useQuery({
    queryKey: ['services'],
    queryFn: () => getServices(),
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: ['appointments'],
    });

    queryClient.invalidateQueries({
      queryKey: ['services'],
    });

    void refetchAppointments();
    void refetchServices();
  };

  const stats = React.useMemo(() => {
    const loadingValue = 'Loading...';
    const errorValue = 'Error';

    const today = new Date();
    const todayString = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-');

    // Count only deposits marked as paid
    // in the new appointment database.
    // Unpaid deposit amounts are not revenue.
    const totalRevenue = appointmentsError
      ? 0
      : appointments.reduce((sum, apt) => {
          if (!apt.depositPaidAt) {
            return sum;
          }

          const amount = Number(apt.depositPaid || 0);

          return sum + (
            Number.isFinite(amount) && amount > 0
              ? amount
              : 0
          );
        }, 0);

    // Requests Briana has not reviewed yet.
    const pendingRequests = appointments.filter(
      apt => apt.status === 'pending'
    ).length;

    // Future appointments with an assigned
    // deposit or confirmed payment.
    const upcomingAppointments = appointments.filter(
      apt =>
        (apt.status === 'awaiting_deposit' ||
          apt.status === 'confirmed') &&
        apt.appointmentDate >= todayString
    ).length;

    // Only confirmed appointments count
    // as bookings, not pending requests.
    const totalBookings = appointments.filter(
      apt => apt.status === 'confirmed'
    ).length;

    const activeServices = services.filter(
      service => service.isActive !== false
    ).length;

    const appointmentValue = (value: number) =>
      appointmentsLoading
        ? loadingValue
        : appointmentsError
          ? errorValue
          : value;

    return [
      {
        title: 'Total Revenue',
        value: appointmentsLoading
          ? loadingValue
          : appointmentsError
            ? errorValue
            : `$${totalRevenue.toFixed(2)}`,
        icon: DollarSign,
        color: 'from-green-400 to-green-600',
      },
      {
        title: 'Pending Requests',
        value: appointmentValue(pendingRequests),
        icon: ClipboardList,
        color: 'from-yellow-400 to-orange-400',
      },
      {
        title: 'Upcoming Appointments',
        value: appointmentValue(upcomingAppointments),
        icon: Calendar,
        color: 'from-blue-400 to-blue-600',
      },
      {
        title: 'Active Services',
        value: servicesLoading
          ? loadingValue
          : servicesError
            ? errorValue
            : activeServices,
        icon: TrendingUp,
        color: 'from-pink-400 to-pink-600',
      },
      {
        title: 'Total Bookings',
        value: appointmentValue(totalBookings),
        icon: Users,
        color: 'from-purple-400 to-purple-600',
      },
    ];
  }, [
    appointments,
    services,
    appointmentsLoading,
    appointmentsError,
    servicesLoading,
    servicesError,
  ]);

  const recentAppointments = React.useMemo(() => {
    return [...appointments]
      .sort((a, b) => {
        const first = new Date(a.createdAt || 0).getTime();
        const second = new Date(b.createdAt || 0).getTime();

        return second - first;
      })
      .slice(0, 5);
  }, [appointments]);

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-700';

      case 'pending':
        return 'bg-yellow-100 text-yellow-700';

      case 'awaiting_deposit':
        return 'bg-blue-100 text-blue-700';

      case 'declined':
        return 'bg-red-100 text-red-700';

      case 'cancelled':
        return 'bg-gray-200 text-gray-700';

      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending Review';

      case 'awaiting_deposit':
        return 'Awaiting Deposit';

      case 'confirmed':
        return 'Confirmed';

      case 'declined':
        return 'Declined';

      case 'cancelled':
        return 'Cancelled';

      default:
        return status || 'Unknown';
    }
  };

  return (
    <AdminLayout>
      <div>
        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Dashboard Overview
          </h1>

          <button
            onClick={handleRefresh}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            disabled={appointmentsLoading || servicesLoading}
          >
            <RefreshCw
              className={`h-4 w-4 ${
                appointmentsLoading || servicesLoading
                  ? 'animate-spin'
                  : ''
              }`}
            />

            <span>Refresh Data</span>
          </button>
        </div>

        {/* Loading State */}
        {(appointmentsLoading || servicesLoading) && (
          <div className="text-center py-8">
            <p className="text-gray-600">
              Loading dashboard data...
            </p>
          </div>
        )}

        {/* Appointment Error */}
        {appointmentsError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">
              Error loading appointments:{' '}
              {appointmentsError instanceof Error
                ? appointmentsError.message
                : 'Unknown error'}
            </p>
          </div>
        )}

        {/* Services Error */}
        {servicesError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">
              Error loading services:{' '}
              {servicesError instanceof Error
                ? servicesError.message
                : 'Unknown error'}
            </p>
          </div>
        )}

        {/* Dashboard Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card
              key={index}
              className="p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    {stat.title}
                  </p>

                  <p className="text-3xl font-bold text-gray-800">
                    {stat.value}
                  </p>
                </div>

                <div
                  className={`bg-gradient-to-br ${stat.color} p-3 rounded-xl`}
                >
                  <stat.icon
                    className="text-white"
                    size={24}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Dashboard Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Appointments */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">
              Recent Appointments
            </h2>

            {appointmentsLoading && (
              <p className="text-gray-500 text-center py-4">
                Loading appointments...
              </p>
            )}

            {!appointmentsLoading &&
              !appointmentsError &&
              recentAppointments.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p className="mb-2">
                    No appointments found
                  </p>

                  <p className="text-sm">
                    Appointment requests will appear here
                    once submitted.
                  </p>
                </div>
              )}

            <div className="space-y-3">
              {!appointmentsLoading &&
                !appointmentsError &&
                recentAppointments.map(apt => (
                  <div
                    key={apt.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800">
                        {apt.customerName || 'N/A'}
                      </p>

                      <p className="text-sm text-gray-600">
                        {apt.appointmentDate || 'N/A'} at{' '}
                        {apt.appointmentTime
                          ? formatTime12Hour(
                              apt.appointmentTime
                            )
                          : 'N/A'}
                      </p>

                      <p className="text-xs text-gray-500 mt-1">
                        Total: $
                        {Number(
                          apt.totalPrice || 0
                        ).toFixed(2)}
                        {' | '}
                        Deposit Paid: $
                        {Number(
                          apt.depositPaid || 0
                        ).toFixed(2)}
                        {' | '}
                        Balance: $
                        {Number(
                          apt.balanceDue || 0
                        ).toFixed(2)}
                      </p>
                    </div>

                    <div className="sm:text-right shrink-0">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusClass(
                          apt.status
                        )}`}
                      >
                        {getStatusLabel(apt.status)}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </Card>

          {/* Services Overview */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">
              Services Overview
            </h2>

            <div className="space-y-3">
              {!servicesLoading &&
              !servicesError &&
              services.length > 0 ? (
                services.slice(0, 5).map(service => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800">
                        {service.title}
                      </p>

                      <p className="text-sm text-gray-600">
                        {service.category}
                      </p>
                    </div>

                    <span className="font-bold text-pink-600 shrink-0">
                      ${service.price}
                    </span>
                  </div>
                ))
              ) : !servicesLoading &&
                !servicesError ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="mb-2">
                    No services found
                  </p>

                  <p className="text-sm">
                    Add services to get started.
                  </p>
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
