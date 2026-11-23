
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { getAppointments } from '@/services/appointmentService';
import { getServices } from '@/services/servicesData';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/card';

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  DollarSign,
  Heart,
  Scissors,
  Sparkles,
  Users,
} from 'lucide-react';

import { formatTime12Hour } from '@/utils/dateTime';

const currency = (value: unknown) => {
  const amount = Number(value ?? 0);
  return `$${(Number.isFinite(amount) ? amount : 0).toFixed(2)}`;
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

const getStatusClass = (status: string) => {
  switch (status) {
    case 'pending':
      return 'border-[#EBCF9D] bg-[#FFF8E9] text-[#91641E]';
    case 'awaiting_deposit':
      return 'border-[#D9D2ED] bg-[#F5F1FC] text-[#68538D]';
    case 'confirmed':
      return 'border-[#C7E4D2] bg-[#EFF9F2] text-[#397A53]';
    case 'declined':
      return 'border-[#F0C9D0] bg-[#FFF0F2] text-[#A5465B]';
    case 'cancelled':
      return 'border-[#E5DDE1] bg-[#F6F3F4] text-[#766C71]';
    default:
      return 'border-[#E5DDE1] bg-[#F6F3F4] text-[#766C71]';
  }
};

const AdminDashboard = () => {
  const {
    data: appointments = [],
    error: appointmentsError,
    isLoading: appointmentsLoading,
  } = useQuery({
    queryKey: ['appointments'],
    queryFn: getAppointments,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  });

  const {
    data: services = [],
    error: servicesError,
    isLoading: servicesLoading,
  } = useQuery({
    queryKey: ['services'],
    queryFn: getServices,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  });

  const todayString = React.useMemo(() => {
    const now = new Date();

    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');
  }, []);

  const dashboardData = React.useMemo(() => {
    const pendingRequests = appointments.filter(
      appointment => appointment.status === 'pending'
    );

    const upcomingAppointments = appointments.filter(
      appointment =>
        (appointment.status === 'awaiting_deposit' ||
          appointment.status === 'confirmed') &&
        appointment.appointmentDate >= todayString
    );

    const confirmedBookings = appointments.filter(
      appointment => appointment.status === 'confirmed'
    );

    const totalRevenue = appointments.reduce(
      (sum, appointment) => {
        if (!appointment.depositPaidAt) return sum;

        const paid = Number(appointment.depositPaid || 0);

        return sum + (
          Number.isFinite(paid) && paid > 0 ? paid : 0
        );
      },
      0
    );

    const activeServices = services.filter(
      service => service.isActive !== false
    );

    const recentAppointments = [...appointments]
      .sort((first, second) => {
        const firstDate = new Date(
          first.createdAt || 0
        ).getTime();

        const secondDate = new Date(
          second.createdAt || 0
        ).getTime();

        return secondDate - firstDate;
      })
      .slice(0, 5);

    return {
      pendingRequests,
      upcomingAppointments,
      confirmedBookings,
      totalRevenue,
      activeServices,
      recentAppointments,
    };
  }, [appointments, services, todayString]);

  const appointmentValue = (value: number | string) => {
    if (appointmentsLoading) return '...';
    if (appointmentsError) return '—';
    return value;
  };

  const servicesValue = (value: number) => {
    if (servicesLoading) return '...';
    if (servicesError) return '—';
    return value;
  };

  const stats = [
    {
      title: 'Total Revenue',
      value: appointmentValue(
        currency(dashboardData.totalRevenue)
      ),
      description: 'Recorded paid deposits',
      icon: DollarSign,
      iconBackground: 'bg-[#F7DDE4]',
      iconColor: 'text-[#963F60]',
    },
    {
      title: 'Pending Requests',
      value: appointmentValue(
        dashboardData.pendingRequests.length
      ),
      description: 'Awaiting your review',
      icon: ClipboardList,
      iconBackground: 'bg-[#FFF2DD]',
      iconColor: 'text-[#9C7029]',
    },
    {
      title: 'Upcoming Appointments',
      value: appointmentValue(
        dashboardData.upcomingAppointments.length
      ),
      description: 'Scheduled for today or later',
      icon: CalendarDays,
      iconBackground: 'bg-[#F1EAF7]',
      iconColor: 'text-[#805D98]',
    },
    {
      title: 'Active Services',
      value: servicesValue(
        dashboardData.activeServices.length
      ),
      description: 'Available on your nail menu',
      icon: Scissors,
      iconBackground: 'bg-[#FCE9EF]',
      iconColor: 'text-[#B05B7C]',
    },
    {
      title: 'Total Bookings',
      value: appointmentValue(
        dashboardData.confirmedBookings.length
      ),
      description: 'Confirmed appointments',
      icon: Users,
      iconBackground: 'bg-[#EAF5EE]',
      iconColor: 'text-[#498564]',
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* ===================================
            WELCOME HEADER
        =================================== */}

        <section className="relative overflow-hidden rounded-2xl border border-[#F0DCE3] bg-white px-6 py-8 shadow-[0_5px_24px_rgba(41,37,43,0.035)] sm:px-8 sm:py-10">
          <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[#F7DDE4]/55 blur-3xl" />

          <div className="pointer-events-none absolute bottom-0 right-12 h-32 w-32 rounded-full bg-[#FFF0F4] blur-2xl" />

          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles
                  size={16}
                  className="text-[#963F60]"
                />

                <span className="brand-eyebrow">
                  Your Studio Workspace
                </span>
              </div>

              <h1 className="brand-heading text-[42px] leading-[1.05] text-[#29252B] sm:text-[52px] lg:text-[58px]">
                Welcome back,
                <br />
                <span className="brand-heading-accent">
                  Briana.
                </span>
              </h1>

              <p className="mt-5 max-w-lg text-[13px] leading-7 text-[#786A72] sm:text-sm">
                Everything you need to manage your
                appointments, services, and studio
                activity — all in one beautiful place.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3 self-start rounded-xl border border-[#F0DCE3] bg-[#FFF7F8] px-4 py-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#963F60]">
                <Heart size={21} strokeWidth={1.6} />
              </div>

              <div>
                <p className="text-xs font-semibold text-[#29252B]">
                  InLoveNailz
                </p>

                <p className="mt-0.5 text-[11px] text-[#96858E]">
                  By Briana
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================
            PAGE SECTION HEADING
        =================================== */}

        <section>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="brand-eyebrow mb-2">
                At a Glance
              </p>

              <h2 className="font-heading text-[32px] text-[#29252B] sm:text-[38px]">
                Studio Overview
              </h2>
            </div>

            <p className="text-xs text-[#96858E]">
              Your latest studio activity
            </p>
          </div>

          {/* ===================================
              STATISTICS
          =================================== */}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            {stats.map(stat => (
              <Card
                key={stat.title}
                className="brand-card flex min-h-[174px] flex-col justify-between p-5 transition-shadow duration-200 hover:shadow-[0_10px_30px_rgba(41,37,43,0.07)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[12px] font-semibold leading-5 text-[#786A72]">
                    {stat.title}
                  </p>

                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${stat.iconBackground} ${stat.iconColor}`}
                  >
                    <stat.icon size={20} strokeWidth={1.8} />
                  </div>
                </div>

                <div className="mt-5">
                  <p className="font-heading text-[39px] font-semibold leading-none tracking-tight text-[#29252B]">
                    {stat.value}
                  </p>

                  <p className="mt-2 text-[11px] leading-5 text-[#96858E]">
                    {stat.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* ===================================
            LOADING AND ERROR STATES
        =================================== */}

        {(appointmentsLoading || servicesLoading) && (
          <div
            role="status"
            className="rounded-xl border border-[#F0DCE3] bg-white px-5 py-4 text-sm text-[#786A72]"
          >
            Loading your studio information...
          </div>
        )}

        {appointmentsError && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
          >
            Unable to load appointments:{' '}
            {appointmentsError instanceof Error
              ? appointmentsError.message
              : 'Please try again later.'}
          </div>
        )}

        {servicesError && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
          >
            Unable to load services:{' '}
            {servicesError instanceof Error
              ? servicesError.message
              : 'Please try again later.'}
          </div>
        )}

        {/* ===================================
            PENDING REQUESTS HIGHLIGHT
        =================================== */}

        {!appointmentsLoading &&
          !appointmentsError &&
          dashboardData.pendingRequests.length > 0 && (
            <section className="flex flex-col gap-5 rounded-2xl border border-[#EBCBD6] bg-[#FCECF1] px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-[#963F60] shadow-sm">
                  <ClipboardList
                    size={22}
                    strokeWidth={1.7}
                  />
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#963F60]">
                    Attention Needed
                  </p>

                  <h3 className="mt-1 font-heading text-[27px] text-[#29252B]">
                    {dashboardData.pendingRequests.length}{' '}
                    {dashboardData.pendingRequests.length === 1
                      ? 'request is'
                      : 'requests are'}{' '}
                    waiting for review
                  </h3>

                  <p className="mt-1 text-xs leading-6 text-[#786A72]">
                    Review new appointment requests and
                    prepare deposit details for your
                    customers.
                  </p>
                </div>
              </div>

              <Link
                to="/admin/appointments"
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#963F60] px-5 py-3 text-[12px] font-semibold text-white transition-colors hover:bg-[#79324F]"
              >
                View Requests
                <ArrowRight size={16} />
              </Link>
            </section>
          )}

        {/* ===================================
            APPOINTMENTS AND SERVICES
        =================================== */}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* Recent Appointments */}
          <Card className="brand-card overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F3E5E9] px-5 py-5 sm:px-6">
              <div>
                <p className="brand-eyebrow mb-2">
                  Booking Activity
                </p>

                <h2 className="font-heading text-[29px] text-[#29252B]">
                  Recent Appointments
                </h2>
              </div>

              <Link
                to="/admin/appointments"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#963F60] hover:text-[#79324F]"
              >
                View All
                <ArrowRight size={15} />
              </Link>
            </div>

            <div className="p-4 sm:p-5">
              {!appointmentsLoading &&
                !appointmentsError &&
                dashboardData.recentAppointments.length === 0 && (
                  <div className="flex flex-col items-center py-10 text-center">
                    <CalendarDays
                      size={30}
                      strokeWidth={1.5}
                      className="mb-3 text-[#EFA1B7]"
                    />

                    <p className="font-semibold text-[#29252B]">
                      No appointments yet
                    </p>

                    <p className="mt-2 max-w-xs text-xs leading-6 text-[#96858E]">
                      New appointment requests will
                      appear here when customers submit
                      them.
                    </p>
                  </div>
                )}

              {!appointmentsLoading &&
                !appointmentsError && (
                  <div className="space-y-3">
                    {dashboardData.recentAppointments.map(
                      appointment => (
                        <div
                          key={appointment.id}
                          className="rounded-xl border border-[#F2E5E9] bg-[#FFFBFC] p-4 transition-colors hover:bg-[#FFF7F8]"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-[#29252B]">
                                {appointment.customerName ||
                                  'Customer'}
                              </p>

                              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#786A72]">
                                <Clock3
                                  size={13}
                                  className="text-[#963F60]"
                                />

                                {appointment.appointmentDate ||
                                  'Date unavailable'}

                                <span>·</span>

                                {appointment.appointmentTime
                                  ? formatTime12Hour(
                                      appointment.appointmentTime
                                    )
                                  : 'Time unavailable'}
                              </p>
                            </div>

                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getStatusClass(
                                appointment.status
                              )}`}
                            >
                              {getStatusLabel(
                                appointment.status
                              )}
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#F2E5E9] pt-3">
                            <div>
                              <p className="text-[10px] text-[#96858E]">
                                Total
                              </p>

                              <p className="mt-1 text-xs font-semibold text-[#29252B]">
                                {currency(
                                  appointment.totalPrice
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] text-[#96858E]">
                                Deposit Paid
                              </p>

                              <p className="mt-1 text-xs font-semibold text-[#397A53]">
                                {currency(
                                  appointment.depositPaid
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] text-[#96858E]">
                                Balance
                              </p>

                              <p className="mt-1 text-xs font-semibold text-[#963F60]">
                                {currency(
                                  appointment.balanceDue
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
            </div>
          </Card>

          {/* Services Overview */}
          <Card className="brand-card overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F3E5E9] px-5 py-5 sm:px-6">
              <div>
                <p className="brand-eyebrow mb-2">
                  Your Nail Menu
                </p>

                <h2 className="font-heading text-[29px] text-[#29252B]">
                  Services Overview
                </h2>
              </div>

              <Link
                to="/admin/services"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#963F60] hover:text-[#79324F]"
              >
                Manage Services
                <ArrowRight size={15} />
              </Link>
            </div>

            <div className="p-4 sm:p-5">
              {!servicesLoading &&
                !servicesError &&
                services.length === 0 && (
                  <div className="flex flex-col items-center py-10 text-center">
                    <Scissors
                      size={30}
                      strokeWidth={1.5}
                      className="mb-3 text-[#EFA1B7]"
                    />

                    <p className="font-semibold text-[#29252B]">
                      No services yet
                    </p>

                    <p className="mt-2 max-w-xs text-xs leading-6 text-[#96858E]">
                      Add services to begin building
                      your nail menu.
                    </p>
                  </div>
                )}

              {!servicesLoading &&
                !servicesError && (
                  <div className="space-y-3">
                    {services.slice(0, 5).map(service => (
                      <div
                        key={service.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-[#F2E5E9] bg-[#FFFBFC] p-4 transition-colors hover:bg-[#FFF7F8]"
                      >
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-[#29252B]">
                            {service.title}
                          </p>

                          <p className="mt-1 text-xs text-[#96858E]">
                            {service.category}
                          </p>
                        </div>

                        <div className="shrink-0 rounded-lg bg-[#F7DDE4]/65 px-3 py-2">
                          <span className="text-[12px] font-bold text-[#963F60]">
                            {currency(service.price)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              {!servicesLoading && !servicesError &&
                services.length > 5 && (
                  <p className="mt-4 text-center text-xs text-[#96858E]">
                    Showing 5 of {services.length} services
                  </p>
                )}
            </div>
          </Card>
        </div>

        {/* ===================================
            QUICK ACCESS
        =================================== */}

        <section>
          <div className="mb-5">
            <p className="brand-eyebrow mb-2">
              Studio Tools
            </p>

            <h2 className="font-heading text-[32px] text-[#29252B] sm:text-[38px]">
              Quick Access
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                title: 'Appointments',
                description:
                  'Review requests and manage bookings.',
                path: '/admin/appointments',
                icon: CalendarDays,
              },
              {
                title: 'Services',
                description:
                  'Update your nail menu and pricing.',
                path: '/admin/services',
                icon: Scissors,
              },
              {
                title: 'Schedule',
                description:
                  'Manage your studio availability.',
                path: '/admin/schedule',
                icon: CheckCircle2,
              },
            ].map(item => (
              <Link
                key={item.path}
                to={item.path}
                className="group flex items-center gap-4 rounded-xl border border-[#F0DCE3] bg-white p-5 shadow-[0_4px_18px_rgba(41,37,43,0.025)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#EFA1B7] hover:shadow-[0_8px_24px_rgba(41,37,43,0.055)]"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FFF0F4] text-[#963F60]">
                  <item.icon
                    size={21}
                    strokeWidth={1.7}
                  />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-[#29252B]">
                    {item.title}
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-[#96858E]">
                    {item.description}
                  </p>
                </div>

                <ArrowRight
                  size={16}
                  className="shrink-0 text-[#B18C9C] transition-transform group-hover:translate-x-1"
                />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
