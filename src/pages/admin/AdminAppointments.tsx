
import React from 'react';
import { useQuery } from '@tanstack/react-query';

import { getAppointments } from '@/services/appointmentService';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/card';

import {
  CalendarDays,
  Clock3,
  Mail,
  Phone,
  DollarSign,
  ClipboardList,
  Search,
  Heart,
  Scissors,
  Image as ImageIcon,
  MessageSquareText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  UserRound,
} from 'lucide-react';

import {
  formatDate,
  formatTime12Hour,
} from '@/utils/dateTime';

type AppointmentStatus =
  | 'pending'
  | 'awaiting_deposit'
  | 'confirmed'
  | 'declined'
  | 'cancelled'
  | 'completed';

type StatusFilter =
  | 'all'
  | 'pending'
  | 'awaiting_deposit'
  | 'confirmed'
  | 'declined'
  | 'cancelled';

const currency = (value: unknown): string => {
  const number = Number(value ?? 0);

  return `$${(
    Number.isFinite(number) ? number : 0
  ).toFixed(2)}`;
};

const getStatusLabel = (status: string): string => {
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
    case 'completed':
      return 'Completed';
    default:
      return status || 'Unknown';
  }
};

const getStatusClass = (status: string): string => {
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

    case 'completed':
      return 'border-[#C9DDEA] bg-[#EFF7FC] text-[#42728F]';

    default:
      return 'border-[#E5DDE1] bg-[#F6F3F4] text-[#766C71]';
  }
};

const formatAppointmentDate = (value: unknown) => {
  if (!value) return 'Date unavailable';

  try {
    return formatDate(String(value));
  } catch {
    return String(value);
  }
};

const formatAppointmentTime = (value: unknown) => {
  if (!value) return 'Time unavailable';

  try {
    return formatTime12Hour(String(value));
  } catch {
    return String(value);
  }
};

const AdminAppointments = () => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] =
    React.useState<StatusFilter>('all');

  const {
    data: appointments = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['appointments'],
    queryFn: getAppointments,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const sortedAppointments = React.useMemo(() => {
    return [...appointments].sort((first, second) => {
      const firstCreated = new Date(
        first.createdAt || 0
      ).getTime();

      const secondCreated = new Date(
        second.createdAt || 0
      ).getTime();

      return secondCreated - firstCreated;
    });
  }, [appointments]);

  const counts = React.useMemo(() => {
    return {
      all: appointments.length,
      pending: appointments.filter(
        appointment => appointment.status === 'pending'
      ).length,
      awaiting_deposit: appointments.filter(
        appointment =>
          appointment.status === 'awaiting_deposit'
      ).length,
      confirmed: appointments.filter(
        appointment => appointment.status === 'confirmed'
      ).length,
      declined: appointments.filter(
        appointment => appointment.status === 'declined'
      ).length,
      cancelled: appointments.filter(
        appointment => appointment.status === 'cancelled'
      ).length,
    };
  }, [appointments]);

  const filteredAppointments = React.useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return sortedAppointments.filter(appointment => {
      const matchesStatus =
        statusFilter === 'all' ||
        appointment.status === statusFilter;

      const searchableText = [
        appointment.customerName,
        appointment.customerEmail,
        appointment.customerPhone,
        appointment.appointmentDate,
        appointment.appointmentTime,
        appointment.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch =
        !query || searchableText.includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [sortedAppointments, searchTerm, statusFilter]);

  const filters: {
    key: StatusFilter;
    label: string;
    count: number;
  }[] = [
    {
      key: 'all',
      label: 'All Requests',
      count: counts.all,
    },
    {
      key: 'pending',
      label: 'Pending',
      count: counts.pending,
    },
    {
      key: 'awaiting_deposit',
      label: 'Awaiting Deposit',
      count: counts.awaiting_deposit,
    },
    {
      key: 'confirmed',
      label: 'Confirmed',
      count: counts.confirmed,
    },
    {
      key: 'declined',
      label: 'Declined',
      count: counts.declined,
    },
    {
      key: 'cancelled',
      label: 'Cancelled',
      count: counts.cancelled,
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-7">
        {/* ===================================
            PAGE HEADER
        =================================== */}

        <section className="relative overflow-hidden rounded-2xl border border-[#F0DCE3] bg-white px-6 py-8 shadow-[0_5px_24px_rgba(41,37,43,0.035)] sm:px-8 sm:py-10">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#F7DDE4]/60 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Heart
                  size={15}
                  className="text-[#963F60]"
                />

                <span className="brand-eyebrow">
                  Studio Management
                </span>
              </div>

              <h1 className="brand-heading text-[42px] text-[#29252B] sm:text-[52px]">
                Appointment{' '}
                <span className="brand-heading-accent">
                  Requests
                </span>
              </h1>

              <p className="mt-4 max-w-xl text-[13px] leading-7 text-[#786A72] sm:text-sm">
                Keep every booking organized, review
                customer details, and stay connected
                with your clients.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3 rounded-xl border border-[#EBCBD6] bg-[#FFF7F8] px-5 py-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#963F60]">
                <ClipboardList size={21} />
              </div>

              <div>
                <p className="font-heading text-[30px] leading-none text-[#29252B]">
                  {isLoading ? '...' : counts.all}
                </p>

                <p className="mt-1 text-[11px] text-[#786A72]">
                  Total Requests
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================
            PENDING REQUESTS NOTICE
        =================================== */}

        {!isLoading && !error && counts.pending > 0 && (
          <section className="flex items-start gap-4 rounded-xl border border-[#EBCBD6] bg-[#FCECF1] px-5 py-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#963F60]">
              <AlertCircle size={21} />
            </div>

            <div>
              <p className="text-[13px] font-semibold text-[#963F60]">
                {counts.pending}{' '}
                {counts.pending === 1
                  ? 'appointment needs'
                  : 'appointments need'}{' '}
                your attention
              </p>

              <p className="mt-1 text-xs leading-6 text-[#786A72]">
                These requests are waiting for review.
                Deposit approval and decline actions
                will be available once the secure
                approval workflow is connected.
              </p>
            </div>
          </section>
        )}

        {/* ===================================
            SEARCH AND FILTERS
        =================================== */}

        <section className="brand-card p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="brand-eyebrow mb-2">
                Booking Directory
              </p>

              <h2 className="font-heading text-[29px] text-[#29252B]">
                Manage Appointments
              </h2>
            </div>

            <div className="relative w-full sm:max-w-[300px]">
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A28F98]"
              />

              <input
                type="search"
                aria-label="Search appointments"
                placeholder="Search customer or date..."
                value={searchTerm}
                onChange={event =>
                  setSearchTerm(event.target.value)
                }
                className="h-11 w-full rounded-lg border border-[#EBD8DF] bg-[#FFFBFC] pl-10 pr-4 text-[13px] text-[#29252B] outline-none transition-colors placeholder:text-[#A28F98] focus:border-[#963F60] focus:ring-2 focus:ring-[#963F60]/10"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {filters.map(filter => {
              const active = statusFilter === filter.key;

              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() =>
                    setStatusFilter(filter.key)
                  }
                  aria-pressed={active}
                  className={`
                    inline-flex min-h-10 items-center
                    gap-2 rounded-lg border px-3.5 py-2
                    text-[12px] font-semibold
                    transition-colors
                    ${
                      active
                        ? 'border-[#963F60] bg-[#963F60] text-white'
                        : 'border-[#EBD8DF] bg-white text-[#786A72] hover:border-[#EFA1B7] hover:bg-[#FFF7F8] hover:text-[#963F60]'
                    }
                  `}
                >
                  {filter.label}

                  <span
                    className={`
                      rounded-md px-1.5 py-0.5
                      text-[10px]
                      ${
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-[#F7DDE4]/60 text-[#963F60]'
                      }
                    `}
                  >
                    {filter.count}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ===================================
            LOADING / ERROR
        =================================== */}

        {isLoading && (
          <div
            role="status"
            className="brand-card flex items-center justify-center gap-3 px-6 py-12 text-sm text-[#786A72]"
          >
            <Loader2
              size={20}
              className="animate-spin text-[#963F60]"
            />
            Loading appointments...
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
          >
            Unable to load appointments:{' '}
            {error instanceof Error
              ? error.message
              : 'Please try again later.'}
          </div>
        )}

        {/* ===================================
            APPOINTMENT CARDS
        =================================== */}

        {!isLoading && !error && (
          <div className="space-y-5">
            {filteredAppointments.map(appointment => {
              const totalPrice = Number(
                appointment.totalPrice || 0
              );

              const depositPaid = appointment.depositPaidAt
                ? Number(appointment.depositPaid || 0)
                : 0;

              const balanceDue = Math.max(
                0,
                totalPrice - depositPaid
              );

              const hasPaidDeposit =
                Boolean(appointment.depositPaidAt) &&
                depositPaid > 0;

              const services = Array.isArray(
                appointment.services
              )
                ? appointment.services
                : [];

              return (
                <Card
                  key={appointment.id}
                  className="brand-card overflow-hidden p-0"
                >
                  {/* CARD HEADER */}

                  <div className="flex flex-col gap-4 border-b border-[#F2E5E9] bg-[#FFFBFC] px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F7DDE4]/70 text-[#963F60]">
                        <UserRound
                          size={22}
                          strokeWidth={1.7}
                        />
                      </div>

                      <div className="min-w-0">
                        <h3 className="font-heading text-[29px] leading-tight text-[#29252B]">
                          {appointment.customerName ||
                            'Customer'}
                        </h3>

                        <p className="mt-1 text-xs text-[#96858E]">
                          Appointment Request
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex self-start rounded-full border px-3 py-1.5 text-[11px] font-semibold ${getStatusClass(
                        appointment.status
                      )}`}
                    >
                      {getStatusLabel(
                        appointment.status
                      )}
                    </span>
                  </div>

                  {/* MAIN CONTENT */}

                  <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_280px] sm:p-6">
                    <div className="min-w-0 space-y-6">
                      {/* DATE AND TIME */}

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="flex items-center gap-3 rounded-xl border border-[#F2E5E9] bg-[#FFF7F8] p-4">
                          <CalendarDays
                            size={20}
                            className="shrink-0 text-[#963F60]"
                          />

                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#96858E]">
                              Appointment Date
                            </p>

                            <p className="mt-1 text-[13px] font-semibold text-[#29252B]">
                              {formatAppointmentDate(
                                appointment.appointmentDate
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 rounded-xl border border-[#F2E5E9] bg-[#FFF7F8] p-4">
                          <Clock3
                            size={20}
                            className="shrink-0 text-[#963F60]"
                          />

                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#96858E]">
                              Appointment Time
                            </p>

                            <p className="mt-1 text-[13px] font-semibold text-[#29252B]">
                              {formatAppointmentTime(
                                appointment.appointmentTime
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* CUSTOMER CONTACT */}

                      <div>
                        <p className="brand-eyebrow mb-3">
                          Customer Information
                        </p>

                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-6">
                          {appointment.customerEmail && (
                            <a
                              href={`mailto:${appointment.customerEmail}`}
                              className="inline-flex min-w-0 items-center gap-2 text-[12px] text-[#786A72] hover:text-[#963F60]"
                            >
                              <Mail
                                size={16}
                                className="shrink-0 text-[#963F60]"
                              />

                              <span className="break-all">
                                {appointment.customerEmail}
                              </span>
                            </a>
                          )}

                          {appointment.customerPhone && (
                            <a
                              href={`tel:${appointment.customerPhone}`}
                              className="inline-flex items-center gap-2 text-[12px] text-[#786A72] hover:text-[#963F60]"
                            >
                              <Phone
                                size={16}
                                className="shrink-0 text-[#963F60]"
                              />

                              {appointment.customerPhone}
                            </a>
                          )}
                        </div>
                      </div>

                      {/* SERVICES */}

                      <div>
                        <p className="brand-eyebrow mb-3">
                          Selected Services
                        </p>

                        {services.length === 0 ? (
                          <p className="text-xs text-[#96858E]">
                            No services listed.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {services.map(
                              (item: any, index: number) => {
                                const service =
                                  item?.service || item;

                                const imageUrl =
                                  service?.images?.[0] ||
                                  service?.image;

                                const title =
                                  service?.title ||
                                  service?.name ||
                                  'Nail Service';

                                const price =
                                  service?.price ??
                                  item?.price ??
                                  0;

                                return (
                                  <div
                                    key={index}
                                    className="flex items-center gap-3 rounded-xl border border-[#F2E5E9] bg-white p-3"
                                  >
                                    {imageUrl ? (
                                      <img
                                        src={imageUrl}
                                        alt={title}
                                        loading="lazy"
                                        className="h-14 w-14 shrink-0 rounded-lg bg-[#FFF7F8] object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[#FFF7F8] text-[#963F60]">
                                        <Scissors size={21} />
                                      </div>
                                    )}

                                    <div className="min-w-0">
                                      <p className="text-[12px] font-semibold leading-5 text-[#29252B]">
                                        {title}
                                      </p>

                                      <p className="mt-1 text-xs font-semibold text-[#963F60]">
                                        {currency(price)}
                                      </p>
                                    </div>
                                  </div>
                                );
                              }
                            )}
                          </div>
                        )}
                      </div>

                      {/* NOTES */}

                      {appointment.notes && (
                        <div className="rounded-xl border border-[#F2E5E9] bg-[#FFFBFC] p-4">
                          <div className="mb-2 flex items-center gap-2">
                            <MessageSquareText
                              size={16}
                              className="text-[#963F60]"
                            />

                            <p className="text-[12px] font-semibold text-[#29252B]">
                              Customer Notes
                            </p>
                          </div>

                          <p className="whitespace-pre-wrap break-words text-[12px] leading-6 text-[#786A72]">
                            {appointment.notes}
                          </p>
                        </div>
                      )}

                      {/* INSPIRATION PHOTO */}

                      {appointment.inspirationUrl && (
                        <div>
                          <div className="mb-3 flex items-center gap-2">
                            <ImageIcon
                              size={16}
                              className="text-[#963F60]"
                            />

                            <p className="text-[12px] font-semibold text-[#29252B]">
                              Inspiration Photo
                            </p>
                          </div>

                          <a
                            href={appointment.inspirationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block overflow-hidden rounded-xl border border-[#F2E5E9] bg-[#FFF7F8]"
                          >
                            <img
                              src={appointment.inspirationUrl}
                              alt="Customer nail inspiration"
                              loading="lazy"
                              className="h-36 w-36 object-contain"
                            />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* PAYMENT SUMMARY */}

                    <div className="space-y-4">
                      <div className="overflow-hidden rounded-xl border border-[#EBCBD6] bg-[#FFF7F8]">
                        <div className="border-b border-[#EBCBD6] bg-[#F7DDE4]/55 px-5 py-4">
                          <div className="flex items-center gap-2">
                            <DollarSign
                              size={18}
                              className="text-[#963F60]"
                            />

                            <h4 className="text-[13px] font-semibold text-[#29252B]">
                              Payment Summary
                            </h4>
                          </div>
                        </div>

                        <div className="space-y-4 p-5">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs text-[#786A72]">
                              Service Total
                            </span>

                            <span className="text-[13px] font-semibold text-[#29252B]">
                              {currency(totalPrice)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs text-[#786A72]">
                              Deposit Requested
                            </span>

                            <span className="text-[13px] font-semibold text-[#29252B]">
                              {appointment.depositAmount != null
                                ? currency(
                                    appointment.depositAmount
                                  )
                                : 'Not Set'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs text-[#786A72]">
                              Deposit Paid
                            </span>

                            <span className="text-[13px] font-semibold text-[#397A53]">
                              {currency(depositPaid)}
                            </span>
                          </div>

                          <div className="border-t border-[#EBCBD6] pt-4">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs font-semibold text-[#29252B]">
                                Remaining Balance
                              </span>

                              <span className="font-heading text-[25px] font-semibold text-[#963F60]">
                                {currency(balanceDue)}
                              </span>
                            </div>
                          </div>

                          <div
                            className={`flex items-start gap-2 rounded-lg p-3 ${
                              hasPaidDeposit
                                ? 'bg-[#EFF9F2]'
                                : 'bg-white'
                            }`}
                          >
                            {hasPaidDeposit ? (
                              <CheckCircle2
                                size={17}
                                className="mt-0.5 shrink-0 text-[#397A53]"
                              />
                            ) : (
                              <Clock3
                                size={17}
                                className="mt-0.5 shrink-0 text-[#963F60]"
                              />
                            )}

                            <p
                              className={`text-[11px] leading-5 ${
                                hasPaidDeposit
                                  ? 'text-[#397A53]'
                                  : 'text-[#786A72]'
                              }`}
                            >
                              {hasPaidDeposit
                                ? 'Deposit payment recorded.'
                                : appointment.status ===
                                    'awaiting_deposit'
                                  ? 'Waiting for the customer to pay the requested deposit.'
                                  : 'No deposit payment has been recorded.'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* CURRENT REQUEST STATUS */}

                      <div className="rounded-xl border border-[#F2E5E9] bg-white p-4">
                        <p className="brand-eyebrow mb-2">
                          Request Status
                        </p>

                        <span
                          className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-semibold ${getStatusClass(
                            appointment.status
                          )}`}
                        >
                          {getStatusLabel(
                            appointment.status
                          )}
                        </span>

                        <p className="mt-3 text-[11px] leading-5 text-[#96858E]">
                          {appointment.status === 'pending'
                            ? 'This request is waiting for administrator review.'
                            : appointment.status ===
                                'awaiting_deposit'
                              ? 'A deposit is required before this booking can be confirmed.'
                              : appointment.status ===
                                  'confirmed'
                                ? 'This appointment is confirmed.'
                                : appointment.status ===
                                    'declined'
                                  ? 'This appointment request was declined.'
                                  : appointment.status ===
                                      'cancelled'
                                    ? 'This appointment was cancelled.'
                                    : 'Appointment information is available above.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}

            {/* EMPTY RESULTS */}

            {filteredAppointments.length === 0 && (
              <div className="brand-card flex flex-col items-center px-6 py-14 text-center">
                <CalendarDays
                  size={34}
                  strokeWidth={1.5}
                  className="mb-4 text-[#EFA1B7]"
                />

                <h3 className="font-heading text-[29px] text-[#29252B]">
                  {appointments.length === 0
                    ? 'No Appointments Yet'
                    : 'No Matching Appointments'}
                </h3>

                <p className="mt-2 max-w-sm text-xs leading-6 text-[#96858E]">
                  {appointments.length === 0
                    ? 'New customer appointment requests will appear here when submitted.'
                    : 'Try changing your search or selecting another status filter.'}
                </p>

                {appointments.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                    }}
                    className="mt-5 inline-flex min-h-10 items-center justify-center rounded-lg border border-[#963F60] px-5 py-2 text-xs font-semibold text-[#963F60] transition-colors hover:bg-[#F7DDE4]"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminAppointments;
