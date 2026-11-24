import React from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

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
  ShieldCheck,
  XCircle,
} from 'lucide-react';

import {
  formatDate,
  formatTime12Hour,
} from '@/utils/dateTime';

type StatusFilter =
  | 'all'
  | 'pending'
  | 'awaiting_deposit'
  | 'confirmed'
  | 'declined'
  | 'cancelled';

type DecisionAction = 'approve' | 'decline';

type DecisionRequest = {
  appointmentId: string;
  action: DecisionAction;
  depositAmount?: number;
};

type ApiResponse = {
  success: boolean;
  message?: string;
  error?: string;
  checkoutUrl?: string;
  emailAccepted?: boolean;
};

type CancellationRequest = {
  appointmentId: string;
  reason: string;
};

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

const parseDeposit = (value: string): number | null => {
  const trimmed = value.trim();

  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return null;
  }

  const amount = Number(trimmed);

  if (
    !Number.isFinite(amount) ||
    amount < 0.5 ||
    !Number.isSafeInteger(Math.round(amount * 100))
  ) {
    return null;
  }

  return amount;
};

const primaryButtonClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#963F60] px-5 py-3 text-[12px] font-semibold text-white transition-colors hover:bg-[#79324F] disabled:cursor-not-allowed disabled:opacity-60';

const secondaryButtonClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#DCA7B6] bg-white px-5 py-3 text-[12px] font-semibold text-[#963F60] transition-colors hover:border-[#963F60] hover:bg-[#FCECF1] disabled:cursor-not-allowed disabled:opacity-60';

const errorClass =
  'mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700';

const successClass =
  'rounded-lg border border-[#C7E4D2] bg-[#EFF9F2] px-4 py-3 text-[12px] leading-5 text-[#397A53]';

async function postAdminAction(
  url: string,
  request: unknown
): Promise<ApiResponse> {
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  let result: ApiResponse;

  try {
    result = await response.json();
  } catch {
    throw new Error(
      'Unable to read the server response. Check the appointment before retrying.'
    );
  }

  if (!response.ok || result?.success !== true) {
    throw new Error(
      result?.error || 'Unable to complete the requested action.'
    );
  }

  return result;
}

async function submitAppointmentDecision(
  request: DecisionRequest
): Promise<ApiResponse> {
  return postAdminAction(
    '/api/admin-appointment-decision',
    request
  );
}

async function submitAppointmentCancellation(
  request: CancellationRequest
): Promise<ApiResponse> {
  return postAdminAction(
    '/api/admin-appointment-cancel',
    request
  );
}

async function createDepositCheckout(
  appointmentId: string
): Promise<ApiResponse> {
  return postAdminAction(
    '/api/admin-deposit-checkout',
    { appointmentId }
  );
}

async function sendDepositPaymentLink(
  appointmentId: string
): Promise<ApiResponse> {
  return postAdminAction(
    '/api/admin-send-deposit-link',
    { appointmentId }
  );
}

const AdminAppointments = () => {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] =
    React.useState('');

  const [statusFilter, setStatusFilter] =
    React.useState<StatusFilter>('all');

  const [depositInputs, setDepositInputs] =
    React.useState<Record<string, string>>({});

  const [decisionErrors, setDecisionErrors] =
    React.useState<Record<string, string>>({});

  const [decisionSuccess, setDecisionSuccess] =
    React.useState<Record<string, string>>({});

  const [paymentErrors, setPaymentErrors] =
    React.useState<Record<string, string>>({});

  const [emailAccepted, setEmailAccepted] =
    React.useState<Record<string, boolean>>({});

  const [processingId, setProcessingId] =
    React.useState<string | null>(null);

  const [sendingId, setSendingId] =
    React.useState<string | null>(null);

  const [paymentStage, setPaymentStage] =
    React.useState<'checkout' | 'email' | null>(null);

  const [cancellingId, setCancellingId] =
    React.useState<string | null>(null);

  const [cancellationReason, setCancellationReason] =
    React.useState('');

  const actionLock = React.useRef(false);

  const {
    data: appointments = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => getAppointments(),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const decisionMutation = useMutation({
    mutationFn: submitAppointmentDecision,
    retry: false,
  });

  const cancellationMutation = useMutation({
    mutationFn: submitAppointmentCancellation,
    retry: false,
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

  const clearDecisionMessages = (id: string) => {
    setDecisionErrors(previous => ({
      ...previous,
      [id]: '',
    }));

    setDecisionSuccess(previous => ({
      ...previous,
      [id]: '',
    }));
  };

  const refreshAppointments = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['appointments'],
      }),
      queryClient.invalidateQueries({
        queryKey: ['admin-dashboard'],
      }),
      queryClient.invalidateQueries({
        queryKey: ['admin-schedule'],
      }),
    ]);
  };

  const handleDecision = async (
    appointmentId: string,
    customerName: string,
    action: DecisionAction,
    totalPrice: number
  ) => {
    if (actionLock.current || processingId) return;

    clearDecisionMessages(appointmentId);

    let depositAmount: number | undefined;

    if (action === 'approve') {
      const input = depositInputs[appointmentId] || '';
      const parsed = parseDeposit(input);

      if (
        parsed === null ||
        !Number.isFinite(totalPrice) ||
        parsed > totalPrice
      ) {
        setDecisionErrors(previous => ({
          ...previous,
          [appointmentId]:
            'Enter a valid deposit of at least $0.50 and no more than the service total.',
        }));

        return;
      }

      depositAmount = parsed;

      const confirmed = window.confirm(
        `Approve the appointment request for ${customerName} with a ${currency(
          parsed
        )} deposit?\n\nThe request will move to Awaiting Deposit.\n\nNo payment link will be created or emailed until you select Create Checkout & Send Link.\n\nThe appointment will NOT be confirmed yet.`
      );

      if (!confirmed) return;
    } else {
      const confirmed = window.confirm(
        `Decline the appointment request for ${customerName}?\n\nThis will change the request status to Declined. This action cannot be undone from this page.\n\nNo automatic customer email will be sent.`
      );

      if (!confirmed) return;
    }

    actionLock.current = true;
    setProcessingId(appointmentId);

    try {
      const result = await decisionMutation.mutateAsync({
        appointmentId,
        action,
        ...(action === 'approve'
          ? { depositAmount }
          : {}),
      });

      setDecisionSuccess(previous => ({
        ...previous,
        [appointmentId]:
          result.message ||
          'Appointment updated successfully.',
      }));

      await refreshAppointments();
    } catch (caughtError) {
      setDecisionErrors(previous => ({
        ...previous,
        [appointmentId]:
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to update the appointment.',
      }));
    } finally {
      actionLock.current = false;
      setProcessingId(null);
    }
  };

  const handleSendDepositLink = async (
    appointmentId: string,
    customerName: string,
    customerEmail: string,
    depositAmount: number
  ) => {
    if (actionLock.current || processingId) return;

    const appointment = appointments.find(
      item => item.id === appointmentId
    );

    setPaymentErrors(previous => ({
      ...previous,
      [appointmentId]: '',
    }));

    if (
      !appointment ||
      appointment.status !== 'awaiting_deposit' ||
      Boolean(appointment.depositPaidAt) ||
      Number(appointment.depositPaid || 0) > 0
    ) {
      setPaymentErrors(previous => ({
        ...previous,
        [appointmentId]:
          'This appointment is no longer eligible for a deposit payment link. Refresh the appointment and review its status.',
      }));

      return;
    }

    if (
      !Number.isFinite(depositAmount) ||
      depositAmount < 0.5 ||
      depositAmount > Number(appointment.totalPrice || 0) ||
      !Number.isSafeInteger(
        Math.round(depositAmount * 100)
      )
    ) {
      setPaymentErrors(previous => ({
        ...previous,
        [appointmentId]:
          'The requested deposit amount is invalid.',
      }));

      return;
    }

    if (!customerEmail.trim()) {
      setPaymentErrors(previous => ({
        ...previous,
        [appointmentId]:
          'A customer email address is required before sending the deposit payment link.',
      }));

      return;
    }

    const confirmed = window.confirm(
      `Create or reuse a Stripe checkout for ${customerName}?\n\nDeposit: ${currency(
        depositAmount
      )}\nEmail: ${customerEmail}\n\nThe payment link will be emailed to the customer.\n\nThis uses your live Stripe payment system. The customer will not be charged until they complete checkout.\n\nContinue?`
    );

    if (!confirmed) return;

    actionLock.current = true;

    setProcessingId(appointmentId);
    setSendingId(appointmentId);
    setPaymentStage('checkout');

    let checkoutReady = false;

    try {
      const checkout = await createDepositCheckout(
        appointmentId
      );

      if (
        typeof checkout.checkoutUrl !== 'string' ||
        !checkout.checkoutUrl
      ) {
        throw new Error(
          'Stripe checkout did not return a valid payment link. Review the checkout before retrying.'
        );
      }

      const checkoutUrl = new URL(
        checkout.checkoutUrl
      );

      if (
        checkoutUrl.protocol !== 'https:' ||
        checkoutUrl.hostname !== 'checkout.stripe.com'
      ) {
        throw new Error(
          'The server returned an unexpected checkout URL. The payment email was not requested.'
        );
      }

      checkoutReady = true;

      setPaymentStage('email');

      const emailResult = await sendDepositPaymentLink(
        appointmentId
      );

      if (emailResult.emailAccepted !== true) {
        throw new Error(
          'The email provider did not confirm acceptance of the payment email.'
        );
      }

      setEmailAccepted(previous => ({
        ...previous,
        [appointmentId]: true,
      }));
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to complete the deposit payment workflow.';

      setPaymentErrors(previous => ({
        ...previous,
        [appointmentId]: checkoutReady
          ? `Stripe checkout is ready, but email acceptance could not be confirmed. ${message} Check Stripe and Resend before retrying.`
          : `Checkout could not be confirmed. ${message} Check Stripe before retrying.`,
      }));
    } finally {
      try {
        await refreshAppointments();
      } finally {
        actionLock.current = false;

        setProcessingId(null);
        setSendingId(null);
        setPaymentStage(null);
      }
    }
  };

  const openCancellation = (
    appointmentId: string
  ) => {
    if (actionLock.current || processingId) return;

    clearDecisionMessages(appointmentId);

    setCancellingId(appointmentId);
    setCancellationReason('');
  };

  const closeCancellation = () => {
    if (actionLock.current || processingId) return;

    setCancellingId(null);
    setCancellationReason('');
  };

  const handleCancellation = async (
    appointmentId: string,
    customerName: string,
    appointmentDate: string,
    appointmentTime: string,
    hasPaidDeposit: boolean
  ) => {
    if (actionLock.current || processingId) return;

    clearDecisionMessages(appointmentId);

    const reason = cancellationReason.trim();

    if (reason.length < 3 || reason.length > 1000) {
      setDecisionErrors(previous => ({
        ...previous,
        [appointmentId]:
          'Enter a cancellation reason between 3 and 1000 characters.',
      }));

      return;
    }

    const paymentWarning = hasPaidDeposit
      ? '\n\nWARNING: This appointment has a recorded deposit payment. Cancelling will NOT automatically refund the customer. You must review and handle any refund separately.'
      : '\n\nNo automatic refund will be issued.';

    const confirmed = window.confirm(
      `Cancel the appointment for ${customerName}?\n\nDate: ${formatAppointmentDate(
        appointmentDate
      )}\nTime: ${formatAppointmentTime(
        appointmentTime
      )}\n\nReason: ${reason}\n\nThis will release the reserved appointment time.${paymentWarning}\n\nNo automatic cancellation email will be sent to the customer.\n\nContinue?`
    );

    if (!confirmed) return;

    actionLock.current = true;
    setProcessingId(appointmentId);

    try {
      const result =
        await cancellationMutation.mutateAsync({
          appointmentId,
          reason,
        });

      setDecisionSuccess(previous => ({
        ...previous,
        [appointmentId]:
          result.message ||
          'Appointment cancelled successfully.',
      }));

      setCancellingId(null);
      setCancellationReason('');

      await refreshAppointments();
    } catch (caughtError) {
      setDecisionErrors(previous => ({
        ...previous,
        [appointmentId]:
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to cancel the appointment.',
      }));
    } finally {
      actionLock.current = false;
      setProcessingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-7">

        {/* PAGE HEADER */}

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

        {/* PENDING REQUESTS NOTICE */}

        {!isLoading && !error && counts.pending > 0 && (
          <section className="flex items-center gap-4 rounded-xl border border-[#EBCBD6] bg-[#FCECF1] px-5 py-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#963F60]">
              <AlertCircle size={21} />
            </div>

            <p className="text-[13px] font-semibold text-[#963F60]">
              {counts.pending}{' '}
              {counts.pending === 1
                ? 'appointment needs'
                : 'appointments need'}{' '}
              your attention
            </p>
          </section>
        )}

        {/* SEARCH AND FILTERS */}

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
              const active =
                statusFilter === filter.key;

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

        {/* LOADING AND ERROR STATES */}

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

        {/* APPOINTMENT CARDS */}

        {!isLoading && !error && (
          <div className="space-y-5">
            {filteredAppointments.map(appointment => {
              const totalPrice = Number(
                appointment.totalPrice || 0
              );

              const depositAmount = Number(
                appointment.depositAmount || 0
              );

              const depositPaid =
                appointment.depositPaidAt
                  ? Number(
                      appointment.depositPaid || 0
                    )
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

              const isPending =
                appointment.status === 'pending';

              const isAwaitingDeposit =
                appointment.status ===
                'awaiting_deposit';

              const canSendDepositLink =
                isAwaitingDeposit &&
                !appointment.depositPaidAt &&
                Number(
                  appointment.depositPaid || 0
                ) === 0;

              const canCancel =
                isAwaitingDeposit ||
                appointment.status === 'confirmed';

              const isCancellationOpen =
                cancellingId === appointment.id;

              const isProcessing =
                processingId === appointment.id;

              const isSending =
                sendingId === appointment.id;

              const isBusy = processingId !== null;

              const depositInput =
                depositInputs[appointment.id] ?? '';

              const wasEmailAccepted =
                emailAccepted[appointment.id] === true;

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

                      {/* CUSTOMER INFORMATION */}

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
                                {
                                  appointment.customerEmail
                                }
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

                      {/* SELECTED SERVICES */}

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
                              (
                                item: any,
                                index: number
                              ) => {
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
                                        <Scissors
                                          size={21}
                                        />
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

                      {/* CUSTOMER NOTES */}

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
                            href={
                              appointment.inspirationUrl
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block overflow-hidden rounded-xl border border-[#F2E5E9] bg-[#FFF7F8]"
                          >
                            <img
                              src={
                                appointment.inspirationUrl
                              }
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
                              {appointment.depositAmount !=
                              null
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
                                : isAwaitingDeposit
                                  ? wasEmailAccepted
                                    ? 'Payment email accepted by the email provider. Awaiting customer payment.'
                                    : 'Awaiting deposit. Use the deposit payment controls below to create or reuse a checkout and send the payment link.'
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
                          {appointment.status ===
                          'pending'
                            ? 'This request is waiting for administrator review.'
                            : isAwaitingDeposit
                              ? 'Approved, but not confirmed. The appointment requires a completed deposit payment.'
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

                  {/* ADMIN APPROVAL CONTROLS */}

                  {isPending && (
                    <div className="border-t border-[#EBCBD6] bg-[#FFF7F8] px-5 py-6 sm:px-6">
                      <div className="mb-5 flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#963F60]">
                          <ShieldCheck size={21} />
                        </div>

                        <div>
                          <h4 className="font-heading text-[25px] text-[#29252B]">
                            Review Appointment
                          </h4>

                          <p className="mt-1 text-[12px] leading-5 text-[#786A72]">
                            Set the deposit amount before
                            approving, or decline this
                            request.
                          </p>
                        </div>
                      </div>

                      <div className="max-w-md">
                        <label
                          htmlFor={`deposit-${appointment.id}`}
                          className="mb-2 block text-[12px] font-semibold text-[#29252B]"
                        >
                          Custom Deposit Amount
                        </label>

                        <div className="relative">
                          <DollarSign
                            size={17}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#963F60]"
                          />

                          <input
                            id={`deposit-${appointment.id}`}
                            type="number"
                            min="0.50"
                            max={totalPrice}
                            step="0.01"
                            inputMode="decimal"
                            placeholder="Enter deposit amount"
                            value={depositInput}
                            disabled={isBusy}
                            onChange={event => {
                              setDepositInputs(
                                previous => ({
                                  ...previous,
                                  [appointment.id]:
                                    event.target.value,
                                })
                              );

                              clearDecisionMessages(
                                appointment.id
                              );
                            }}
                            className="h-12 w-full rounded-lg border border-[#EBCBD6] bg-white pl-10 pr-4 text-[14px] text-[#29252B] outline-none transition-colors placeholder:text-[#A28F98] focus:border-[#963F60] focus:ring-2 focus:ring-[#963F60]/10 disabled:opacity-60"
                          />
                        </div>

                        <p className="mt-2 text-[11px] text-[#786A72]">
                          Service total:{' '}
                          <span className="font-semibold text-[#963F60]">
                            {currency(totalPrice)}
                          </span>
                        </p>

                        <p className="mt-1 text-[11px] text-[#786A72]">
                          Minimum deposit: $0.50
                        </p>
                      </div>

                      <div className="mt-4 rounded-lg border border-[#EBCBD6] bg-white p-4">
                        <div className="flex items-start gap-2">
                          <AlertCircle
                            size={17}
                            className="mt-0.5 shrink-0 text-[#963F60]"
                          />

                          <p className="text-[11px] leading-5 text-[#786A72]">
                            Approval will reserve the
                            appointment as{' '}
                            <strong>
                              Awaiting Deposit
                            </strong>
                            . No payment link or customer
                            notification will be sent until
                            you select Create Checkout &amp;
                            Send Link. The appointment is
                            not confirmed until the Stripe
                            payment workflow is completed.
                          </p>
                        </div>
                      </div>

                      {decisionErrors[
                        appointment.id
                      ] && (
                        <div
                          role="alert"
                          className={errorClass}
                        >
                          {
                            decisionErrors[
                              appointment.id
                            ]
                          }
                        </div>
                      )}

                      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            handleDecision(
                              appointment.id,
                              appointment.customerName ||
                                'this customer',
                              'approve',
                              totalPrice
                            )
                          }
                          className={primaryButtonClass}
                        >
                          {isProcessing ? (
                            <Loader2
                              size={17}
                              className="animate-spin"
                            />
                          ) : (
                            <CheckCircle2 size={17} />
                          )}

                          Approve Request
                        </button>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            handleDecision(
                              appointment.id,
                              appointment.customerName ||
                                'this customer',
                              'decline',
                              totalPrice
                            )
                          }
                          className={
                            secondaryButtonClass
                          }
                        >
                          {isProcessing ? (
                            <Loader2
                              size={17}
                              className="animate-spin"
                            />
                          ) : (
                            <XCircle size={17} />
                          )}

                          Decline Request
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STRIPE DEPOSIT PAYMENT CONTROLS */}

                  {canSendDepositLink && (
                    <div className="border-t border-[#EBCBD6] bg-[#FFF7F8] px-5 py-6 sm:px-6">
                      <div className="mb-5 flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#963F60]">
                          <Mail size={21} />
                        </div>

                        <div>
                          <h4 className="font-heading text-[25px] text-[#29252B]">
                            Deposit Payment
                          </h4>

                          <p className="mt-1 max-w-xl text-[12px] leading-5 text-[#786A72]">
                            Create a secure Stripe checkout
                            and email the deposit payment
                            link to the customer. An
                            eligible existing checkout will
                            be reused by the server.
                          </p>
                        </div>
                      </div>

                      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-[#EBCBD6] bg-white p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#96858E]">
                            Required Deposit
                          </p>

                          <p className="mt-2 font-heading text-[28px] font-semibold text-[#963F60]">
                            {currency(depositAmount)}
                          </p>
                        </div>

                        <div className="rounded-xl border border-[#EBCBD6] bg-white p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#96858E]">
                            Payment Email Recipient
                          </p>

                          <p className="mt-2 break-all text-[13px] font-semibold text-[#29252B]">
                            {appointment.customerEmail ||
                              'No email address available'}
                          </p>
                        </div>
                      </div>

                      <div className="mb-4 rounded-lg border border-[#EBCBD6] bg-white p-4">
                        <div className="flex items-start gap-2">
                          <ShieldCheck
                            size={18}
                            className="mt-0.5 shrink-0 text-[#963F60]"
                          />

                          <div className="space-y-2 text-[12px] leading-5 text-[#786A72]">
                            <p>
                              The customer will receive a
                              secure payment link through
                              email.
                            </p>

                            <p>
                              Creating a checkout does not
                              charge the customer or mark
                              the deposit as paid.
                            </p>

                            <p>
                              The appointment remains
                              Awaiting Deposit until the
                              payment is verified by the
                              server.
                            </p>
                          </div>
                        </div>
                      </div>

                      {wasEmailAccepted && (
                        <div
                          role="status"
                          className={successClass}
                        >
                          <div className="flex items-start gap-2">
                            <CheckCircle2
                              size={18}
                              className="mt-0.5 shrink-0"
                            />

                            <div>
                              <p className="font-semibold">
                                Deposit payment email
                                accepted
                              </p>

                              <p className="mt-1">
                                Resend accepted the deposit
                                payment email. Delivery is
                                not yet confirmed.
                              </p>

                              <p className="mt-1">
                                Awaiting customer payment.
                                This email acceptance
                                notice is retained for the
                                current page session.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {paymentErrors[
                        appointment.id
                      ] && (
                        <div
                          role="alert"
                          className={errorClass}
                        >
                          {
                            paymentErrors[
                              appointment.id
                            ]
                          }
                        </div>
                      )}

                      {isSending && (
                        <div
                          role="status"
                          className="mt-4 flex items-center gap-2 rounded-lg border border-[#EBCBD6] bg-white p-4 text-[12px] text-[#963F60]"
                        >
                          <Loader2
                            size={18}
                            className="animate-spin"
                          />

                          {paymentStage === 'email'
                            ? 'Sending deposit payment email...'
                            : 'Creating or verifying Stripe checkout...'}
                        </div>
                      )}

                      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          disabled={
                            isBusy ||
                            isCancellationOpen ||
                            wasEmailAccepted ||
                            !appointment.customerEmail ||
                            !Number.isFinite(
                              depositAmount
                            ) ||
                            depositAmount < 0.5 ||
                            depositAmount > totalPrice
                          }
                          onClick={() =>
                            handleSendDepositLink(
                              appointment.id,
                              appointment.customerName ||
                                'this customer',
                              appointment.customerEmail ||
                                '',
                              depositAmount
                            )
                          }
                          className={primaryButtonClass}
                        >
                          {isSending ? (
                            <Loader2
                              size={17}
                              className="animate-spin"
                            />
                          ) : wasEmailAccepted ? (
                            <CheckCircle2 size={17} />
                          ) : (
                            <Mail size={17} />
                          )}

                          {isSending
                            ? paymentStage === 'email'
                              ? 'Sending Payment Email...'
                              : 'Creating Checkout...'
                            : wasEmailAccepted
                              ? 'Payment Email Accepted'
                              : 'Create Checkout & Send Link'}
                        </button>
                      </div>

                      <p className="mt-3 text-[11px] leading-5 text-[#96858E]">
                        Payment links are subject to the
                        appointment deposit deadline and
                        Stripe checkout expiration.
                        If an error occurs, review Stripe
                        and Resend before retrying.
                      </p>
                    </div>
                  )}

                  {/* ADMIN CANCELLATION CONTROLS */}

                  {canCancel && (
                    <div className="border-t border-[#EBCBD6] bg-[#FFFBFC] px-5 py-6 sm:px-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF0F2] text-[#A5465B]">
                            <XCircle size={21} />
                          </div>

                          <div>
                            <h4 className="font-heading text-[25px] text-[#29252B]">
                              Cancel Appointment
                            </h4>

                            <p className="mt-1 max-w-xl text-[12px] leading-5 text-[#786A72]">
                              Cancelling releases this
                              appointment's reserved time.
                              The appointment and payment
                              history will be preserved.
                            </p>
                          </div>
                        </div>

                        {!isCancellationOpen && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              openCancellation(
                                appointment.id
                              )
                            }
                            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#DCA7B6] bg-white px-5 py-3 text-[12px] font-semibold text-[#A5465B] transition-colors hover:border-[#A5465B] hover:bg-[#FFF0F2] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <XCircle size={17} />

                            Cancel Appointment
                          </button>
                        )}
                      </div>

                      {isCancellationOpen && (
                        <div className="mt-5 space-y-4 rounded-xl border border-[#EBCBD6] bg-white p-4 sm:p-5">
                          <div>
                            <label
                              htmlFor={`cancel-reason-${appointment.id}`}
                              className="mb-2 block text-[12px] font-semibold text-[#29252B]"
                            >
                              Cancellation Reason

                              <span className="ml-1 text-[#A5465B]">
                                *
                              </span>
                            </label>

                            <textarea
                              id={`cancel-reason-${appointment.id}`}
                              value={cancellationReason}
                              onChange={event => {
                                setCancellationReason(
                                  event.target.value
                                );

                                clearDecisionMessages(
                                  appointment.id
                                );
                              }}
                              maxLength={1000}
                              rows={4}
                              disabled={isBusy}
                              placeholder="Explain why this appointment is being cancelled..."
                              className="w-full resize-y rounded-lg border border-[#EBCBD6] bg-[#FFFBFC] px-4 py-3 text-[13px] text-[#29252B] outline-none transition-colors placeholder:text-[#A28F98] focus:border-[#963F60] focus:ring-2 focus:ring-[#963F60]/10 disabled:opacity-60"
                            />

                            <p className="mt-2 text-right text-[11px] text-[#96858E]">
                              {
                                cancellationReason.length
                              }
                              /1000 characters
                            </p>
                          </div>

                          <div className="rounded-lg border border-[#EBCBD6] bg-[#FFF7F8] p-4">
                            <div className="flex items-start gap-2">
                              <AlertCircle
                                size={18}
                                className="mt-0.5 shrink-0 text-[#963F60]"
                              />

                              <div className="space-y-2 text-[12px] leading-5 text-[#786A72]">
                                <p>
                                  <strong className="text-[#29252B]">
                                    Important:
                                  </strong>{' '}
                                  This action changes the
                                  appointment status to
                                  Cancelled and releases
                                  the reserved time.
                                </p>

                                <p>
                                  The customer will not
                                  automatically receive a
                                  cancellation email.
                                </p>

                                <p>
                                  Refunds are not automatic.
                                  Any deposit refund must
                                  be handled separately.
                                </p>
                              </div>
                            </div>
                          </div>

                          {hasPaidDeposit && (
                            <div
                              role="alert"
                              className="rounded-lg border border-[#EBCF9D] bg-[#FFF8E9] p-4"
                            >
                              <div className="flex items-start gap-2">
                                <AlertCircle
                                  size={18}
                                  className="mt-0.5 shrink-0 text-[#91641E]"
                                />

                                <p className="text-[12px] leading-5 text-[#91641E]">
                                  <strong>
                                    Paid deposit warning:
                                  </strong>{' '}
                                  This customer has paid{' '}
                                  {currency(depositPaid)}.
                                  Cancelling will not
                                  automatically refund
                                  that payment. Review
                                  the payment separately.
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="flex flex-col gap-3 sm:flex-row">
                            <button
                              type="button"
                              disabled={
                                isBusy ||
                                cancellationReason.trim()
                                  .length < 3 ||
                                cancellationReason.trim()
                                  .length > 1000
                              }
                              onClick={() =>
                                handleCancellation(
                                  appointment.id,
                                  appointment.customerName ||
                                    'this customer',
                                  appointment.appointmentDate,
                                  appointment.appointmentTime,
                                  hasPaidDeposit
                                )
                              }
                              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#A5465B] px-5 py-3 text-[12px] font-semibold text-white transition-colors hover:bg-[#843648] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isProcessing ? (
                                <Loader2
                                  size={17}
                                  className="animate-spin"
                                />
                              ) : (
                                <XCircle size={17} />
                              )}

                              Confirm Cancellation
                            </button>

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={closeCancellation}
                              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#EBD8DF] bg-white px-5 py-3 text-[12px] font-semibold text-[#786A72] transition-colors hover:bg-[#FFF7F8] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Keep Appointment
                            </button>
                          </div>
                        </div>
                      )}

                      {decisionErrors[
                        appointment.id
                      ] && (
                        <div
                          role="alert"
                          className={errorClass}
                        >
                          {
                            decisionErrors[
                              appointment.id
                            ]
                          }
                        </div>
                      )}
                    </div>
                  )}

                  {/* DECISION SUCCESS MESSAGE */}

                  {decisionSuccess[
                    appointment.id
                  ] && (
                    <div
                      role="status"
                      className="flex items-start gap-3 border-t border-[#C7E4D2] bg-[#EFF9F2] px-5 py-4 sm:px-6"
                    >
                      <CheckCircle2
                        size={19}
                        className="mt-0.5 shrink-0 text-[#397A53]"
                      />

                      <p className="text-[12px] leading-5 text-[#397A53]">
                        {
                          decisionSuccess[
                            appointment.id
                          ]
                        }
                      </p>
                    </div>
                  )}
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