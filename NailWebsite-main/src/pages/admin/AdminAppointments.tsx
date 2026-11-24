
import React, { useEffect, useRef, useState } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getAppointments } from '@/services/appointmentService';
import { useToast } from '@/hooks/use-toast';
import { formatDate, formatTime12Hour } from '@/utils/dateTime';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
} from 'lucide-react';

type Appointment = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  appointmentDate: string;
  appointmentTime: string;
  services: unknown;
  totalPrice: number;
  durationMinutes: number | null;
  notes: string | null;
  inspirationUrl: string | null;
  status: string;
  depositAmount: number | null;
  depositPaid: number;
  balanceDue: number;
  depositPaidAt: string | null;
  depositExpiresAt: string | null;
  confirmedAt: string | null;
  createdAt: string;
};

type Decision = {
  appointmentId: string;
  action: 'approve' | 'decline';
  depositAmount?: number;
};

function money(value: number | null | undefined): string {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

function statusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'Pending Review';
    case 'awaiting_deposit':
      return 'Awaiting Deposit';
    case 'confirmed':
      return 'Confirmed';
    case 'declined':
      return 'Declined';
    case 'expired':
      return 'Deposit Expired';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status.replace(/_/g, ' ');
  }
}

function statusStyle(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-800';
    case 'awaiting_deposit':
      return 'bg-purple-100 text-purple-800';
    case 'confirmed':
      return 'bg-green-100 text-green-800';
    case 'declined':
    case 'expired':
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    case 'completed':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

async function decideAppointment(
  decision: Decision
): Promise<void> {
  const response = await fetch(
    '/api/admin-appointment-decision',
    {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(decision),
    }
  );

  const result = await response.json().catch(() => null);

  if (!response.ok || result?.success !== true) {
    throw new Error(
      typeof result?.error === 'string'
        ? result.error
        : 'Unable to update this appointment.'
    );
  }
}

function serviceItems(value: unknown): any[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

const AdminAppointments: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const highlightedId = searchParams.get('id');
  const highlightedRef = useRef<HTMLDivElement | null>(null);
  const lastScrolledId = useRef<string | null>(null);

  const [depositInputs, setDepositInputs] = useState<
    Record<string, string>
  >({});

  const {
    data: appointments = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<Appointment[]>({
    queryKey: ['appointments'],
    queryFn: () => getAppointments(),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const decisionMutation = useMutation({
    mutationFn: decideAppointment,

    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ['appointments'],
      });

      toast({
        title:
          variables.action === 'approve'
            ? 'Appointment approved!'
            : 'Appointment declined',
        description:
          variables.action === 'approve'
            ? 'The appointment is awaiting its deposit. No payment link has been sent yet.'
            : 'The pending request has been declined.',
      });
    },

    onError: (mutationError: Error) => {
      toast({
        title: 'Unable to update appointment',
        description: mutationError.message,
        variant: 'destructive',
      });
    },
  });

  useEffect(() => {
    if (!highlightedId || isLoading) {
      return;
    }

    const exists = appointments.some(
      appointment => appointment.id === highlightedId
    );

    if (
      !exists ||
      lastScrolledId.current === highlightedId
    ) {
      return;
    }

    highlightedRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });

    lastScrolledId.current = highlightedId;
  }, [appointments, highlightedId, isLoading]);

  const handleApprove = (appointment: Appointment) => {
    const rawAmount = (
      depositInputs[appointment.id] ?? ''
    ).trim();

    if (!/^\d+(\.\d{1,2})?$/.test(rawAmount)) {
      toast({
        title: 'Enter a valid deposit',
        description: 'Use a dollar amount such as 1.00.',
        variant: 'destructive',
      });
      return;
    }

    const amount = Number(rawAmount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > appointment.totalPrice
    ) {
      toast({
        title: 'Invalid deposit amount',
        description: `Enter an amount greater than $0 and no more than ${money(
          appointment.totalPrice
        )}.`,
        variant: 'destructive',
      });
      return;
    }

    const approved = window.confirm(
      `Approve ${appointment.customerName}'s appointment with a ${money(
        amount
      )} deposit?`
    );

    if (!approved) {
      return;
    }

    decisionMutation.mutate({
      appointmentId: appointment.id,
      action: 'approve',
      depositAmount: amount,
    });
  };

  const handleDecline = (appointment: Appointment) => {
    const declined = window.confirm(
      `Decline ${appointment.customerName}'s appointment request?`
    );

    if (!declined) {
      return;
    }

    decisionMutation.mutate({
      appointmentId: appointment.id,
      action: 'decline',
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6 pb-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="brand-eyebrow mb-2">
              Your Studio Workspace
            </p>

            <h1 className="font-heading text-3xl text-[#29252B] sm:text-4xl">
              Appointments
            </h1>

            <p className="mt-2 text-sm text-[#786A72]">
              Review requests, set deposits, and track bookings.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline">
              Total: {appointments.length}
            </Badge>

            <Button
              type="button"
              variant="outline"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              <RefreshCw
                size={16}
                className={`mr-2 ${
                  isFetching ? 'animate-spin' : ''
                }`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {isLoading && (
          <Card className="flex items-center gap-3 p-6">
            <Loader2 className="animate-spin text-[#963F60]" />
            Loading appointments...
          </Card>
        )}

        {error && (
          <Card className="border-red-200 bg-red-50 p-6">
            <p className="text-sm text-red-700">
              {error instanceof Error
                ? error.message
                : 'Unable to load appointments.'}
            </p>
          </Card>
        )}

        {!isLoading &&
          !error &&
          highlightedId &&
          !appointments.some(
            appointment => appointment.id === highlightedId
          ) && (
            <Card className="border-amber-200 bg-amber-50 p-5">
              <p className="text-sm text-amber-800">
                The requested appointment was not found in
                the current list. Refresh or check whether
                it is still available.
              </p>
            </Card>
          )}

        {!isLoading &&
          !error &&
          appointments.length === 0 && (
            <Card className="p-12 text-center">
              <Calendar
                size={48}
                className="mx-auto mb-4 text-gray-300"
              />

              <h2 className="text-xl font-semibold">
                No appointments yet
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                New customer requests will appear here.
              </p>
            </Card>
          )}

        <div className="space-y-4">
          {appointments.map(appointment => {
            const isHighlighted =
              appointment.id === highlightedId;

            const pending =
              appointment.status === 'pending';

            const isUpdating =
              decisionMutation.isPending &&
              decisionMutation.variables?.appointmentId ===
                appointment.id;

            const services = serviceItems(
              appointment.services
            );

            return (
              <div
                key={appointment.id}
                ref={
                  isHighlighted
                    ? highlightedRef
                    : undefined
                }
              >
                <Card
                  className={`p-5 transition-shadow sm:p-6 ${
                    isHighlighted
                      ? 'border-2 border-[#963F60] shadow-lg'
                      : 'hover:shadow-md'
                  }`}
                >
                  <div className="flex flex-col gap-6 lg:flex-row">
                    <div className="min-w-0 flex-1 space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="text-xl font-bold text-[#29252B]">
                            {appointment.customerName}
                          </h2>

                          <div className="mt-2 space-y-1 text-sm text-gray-600">
                            <p className="flex items-center gap-2 break-all">
                              <Mail
                                size={15}
                                className="shrink-0 text-pink-500"
                              />
                              {appointment.customerEmail}
                            </p>

                            <p className="flex items-center gap-2">
                              <Phone
                                size={15}
                                className="text-pink-500"
                              />
                              {appointment.customerPhone}
                            </p>
                          </div>
                        </div>

                        <Badge
                          className={statusStyle(
                            appointment.status
                          )}
                        >
                          {statusLabel(appointment.status)}
                        </Badge>
                      </div>

                      <div className="grid gap-3 text-sm text-gray-700 sm:grid-cols-2">
                        <p className="flex items-center gap-2">
                          <Calendar
                            size={17}
                            className="text-pink-500"
                          />
                          {formatDate(
                            appointment.appointmentDate
                          )}
                        </p>

                        <p className="flex items-center gap-2">
                          <Clock
                            size={17}
                            className="text-pink-500"
                          />
                          {formatTime12Hour(
                            appointment.appointmentTime
                          )}
                        </p>
                      </div>

                      <div>
                        <h3 className="mb-2 text-sm font-semibold">
                          Services
                        </h3>

                        <div className="flex flex-wrap gap-2">
                          {services.map((item, index) => {
                            const service =
                              item?.service ?? item;

                            return (
                              <div
                                key={index}
                                className="rounded-lg border border-pink-200 bg-pink-50 px-3 py-2 text-sm"
                              >
                                {service?.title ??
                                  service?.name ??
                                  'Service'}
                              </div>
                            );
                          })}

                          {services.length === 0 && (
                            <p className="text-sm text-gray-500">
                              No service details available.
                            </p>
                          )}
                        </div>
                      </div>

                      {appointment.durationMinutes !== null && (
                        <p className="text-xs text-gray-500">
                          Duration: {appointment.durationMinutes}{' '}
                          minutes
                        </p>
                      )}

                      {appointment.notes && (
                        <div>
                          <h3 className="text-sm font-semibold">
                            Customer Notes
                          </h3>

                          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">
                            {appointment.notes}
                          </p>
                        </div>
                      )}

                      {appointment.inspirationUrl && (
                        <a
                          href={appointment.inspirationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-sm font-semibold text-[#963F60] underline"
                        >
                          View inspiration photo
                        </a>
                      )}
                    </div>

                    <div className="space-y-4 lg:w-72">
                      <Card className="bg-[#FFF7F8] p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <DollarSign
                            size={18}
                            className="text-[#963F60]"
                          />

                          <h3 className="font-semibold">
                            Payment
                          </h3>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Total</span>
                            <strong>
                              {money(appointment.totalPrice)}
                            </strong>
                          </div>

                          <div className="flex justify-between">
                            <span>Deposit Required</span>
                            <strong>
                              {appointment.depositAmount === null
                                ? 'Not set'
                                : money(appointment.depositAmount)}
                            </strong>
                          </div>

                          <div className="flex justify-between text-green-700">
                            <span>Deposit Paid</span>
                            <strong>
                              {money(appointment.depositPaid)}
                            </strong>
                          </div>

                          <div className="flex justify-between border-t pt-2">
                            <span>Balance Due</span>
                            <strong>
                              {money(appointment.balanceDue)}
                            </strong>
                          </div>
                        </div>

                        {appointment.status ===
                          'awaiting_deposit' && (
                          <p className="mt-3 flex items-start gap-2 text-xs text-purple-700">
                            <AlertCircle
                              size={15}
                              className="shrink-0"
                            />
                            Approved, but the deposit has not
                            been confirmed.
                          </p>
                        )}

                        {appointment.status === 'confirmed' &&
                          appointment.depositPaidAt && (
                            <p className="mt-3 flex items-center gap-2 text-xs text-green-700">
                              <CheckCircle2 size={15} />
                              Deposit payment confirmed.
                            </p>
                          )}
                      </Card>

                      {pending && (
                        <div className="space-y-3 rounded-xl border border-[#F0DCE3] bg-white p-4">
                          <h3 className="text-sm font-semibold text-[#29252B]">
                            Review Request
                          </h3>

                          <Label
                            htmlFor={`deposit-${appointment.id}`}
                          >
                            Deposit Amount ($)
                          </Label>

                          <Input
                            id={`deposit-${appointment.id}`}
                            type="number"
                            min="0.01"
                            max={appointment.totalPrice}
                            step="0.01"
                            placeholder="Enter deposit amount"
                            value={
                              depositInputs[appointment.id] ??
                              ''
                            }
                            onChange={event =>
                              setDepositInputs(previous => ({
                                ...previous,
                                [appointment.id]:
                                  event.target.value,
                              }))
                            }
                            disabled={decisionMutation.isPending}
                          />

                          <Button
                            type="button"
                            className="w-full bg-[#963F60] text-white hover:bg-[#79324F]"
                            disabled={decisionMutation.isPending}
                            onClick={() =>
                              handleApprove(appointment)
                            }
                          >
                            {isUpdating ? (
                              <Loader2
                                size={16}
                                className="mr-2 animate-spin"
                              />
                            ) : (
                              <CheckCircle2
                                size={16}
                                className="mr-2"
                              />
                            )}
                            Approve Request
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            className="w-full border-red-200 text-red-700 hover:bg-red-50"
                            disabled={decisionMutation.isPending}
                            onClick={() =>
                              handleDecline(appointment)
                            }
                          >
                            Decline Request
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAppointments;
