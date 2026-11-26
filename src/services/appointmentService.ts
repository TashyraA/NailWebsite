
/* =========================================
   INLOVENAILZ BY BRIANA
   APPOINTMENT SERVICE

   - Preserves existing booking functions
   - Reads admin appointments from Neon
   - Supports variable deposit payments
   - Supports remaining balance payments
   - Supports detailed payment statuses
   - Preserves server-calculated totals
   - Supports payment review warnings
   - Supports checkout activity indicators
   - Supports refund review indicators
   - Never calculates or processes payments
========================================= */

/* =====================================
   CREATE APPOINTMENT DATA
===================================== */

export interface CreateAppointmentData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;

  appointmentDate: string;
  appointmentTime: string;

  services: any[];

  totalPrice: number;
  depositPaid: number;
  balanceDue: number;

  notes?: string;
}

/* =====================================
   APPOINTMENT PAYMENT STATE

   Payment status is independent of
   the appointment booking status.
===================================== */

export type AppointmentPaymentState =
  | 'unpaid'
  | 'partially_paid'
  | 'paid_in_full'
  | 'needs_review';

/* =====================================
   ADMIN APPOINTMENT DATA

   Payment amounts are calculated by
   the server using Neon payment records.

   Do not recalculate outstanding balances
   using only the original deposit.
===================================== */

export interface AdminAppointment {
  id: string;

  /* CUSTOMER INFORMATION */

  customerName: string;
  customerEmail: string;
  customerPhone: string;

  /* APPOINTMENT INFORMATION */

  appointmentDate: string;
  appointmentTime: string;

  services: unknown;

  totalPrice: number;
  durationMinutes: number | null;

  notes: string | null;
  inspirationUrl: string | null;

  status: string;

  /* ORIGINAL DEPOSIT PAYMENT */

  depositAmount: number | null;
  depositPaid: number;

  depositPaidAt: string | null;
  depositExpiresAt: string | null;

  /* REMAINING BALANCE PAYMENT */

  balancePaid: number;
  balancePaidAmount: number;
  balancePaidAt: string | null;

  /* SERVER-CALCULATED TOTALS */

  totalPaid: number;
  balanceDue: number;

  /* PAYMENT STATUS */

  hasPaidDeposit: boolean;
  hasPaidBalance: boolean;

  isPaidInFull: boolean;

  paymentStatus: AppointmentPaymentState;
  paymentState: AppointmentPaymentState;

  /* PAYMENT REVIEW */

  paymentNeedsReview: boolean;
  paymentReviewReason: string | null;
  hasPaymentException: boolean;

  /* CHECKOUT ACTIVITY */

  hasDepositCheckoutSession: boolean;
  hasBalanceCheckoutSession: boolean;

  depositCheckoutInProgress: boolean;
  balanceCheckoutInProgress: boolean;

  canPayBalanceOnline: boolean;

  /* REFUND REVIEW */

  refundRequiredReview: boolean;

  /* APPOINTMENT TIMESTAMPS */

  confirmedAt: string | null;
  reviewedAt: string | null;

  createdAt: string;
  updatedAt: string;

  startsAt: string | null;
  endsAt: string | null;
}

/* =====================================
   ADMIN APPOINTMENTS API RESPONSE
===================================== */

interface AdminAppointmentsResponse {
  success: boolean;
  appointments: AdminAppointment[];
  count: number;
  error?: string;
}

/* =====================================
   DEFAULT APPOINTMENT TIME SLOTS
===================================== */

const DEFAULT_TIME_SLOTS = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
];

/* =====================================
   APPOINTMENT AVAILABILITY

   Preserve existing service functions.
===================================== */

export const getAvailableTimeSlots =
  async (): Promise<string[]> =>
    DEFAULT_TIME_SLOTS;

export const getBookedSlotsForDate =
  async (
    _date: string
  ): Promise<string[]> => [];

export const getBlockedDates =
  async (): Promise<any[]> => [];

export const getBlockedTimes =
  async (): Promise<any[]> => [];

/* =====================================
   CREATE APPOINTMENT

   Preserve the existing booking
   endpoint and request structure.
===================================== */

export const createAppointment = async (
  data: CreateAppointmentData
) => {
  const response = await fetch(
    '/api/booking',
    {
      method: 'POST',

      headers: {
        'Content-Type':
          'application/json',
      },

      body: JSON.stringify(data),
    }
  );

  const result =
    await response.json();

  if (!response.ok) {
    throw new Error(
      result.error ||
        'Unable to create booking'
    );
  }

  return result;
};

/* =====================================
   ADMIN APPOINTMENTS — NEON DATABASE

   - Requires administrator session
   - Disables cached responses
   - Returns typed appointment data
   - Preserves server payment calculations
   - Never modifies payment information
===================================== */

export const getAppointments =
  async (): Promise<AdminAppointment[]> => {
    const response = await fetch(
      '/api/admin-appointments',
      {
        method: 'GET',

        credentials:
          'same-origin',

        cache:
          'no-store',
      }
    );

    /* =====================================
       HANDLE ADMIN AUTHENTICATION
    ===================================== */

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error(
          'Your admin session has expired. Please log in again.'
        );
      }

      if (response.status === 403) {
        throw new Error(
          'You do not have permission to access appointments.'
        );
      }

      throw new Error(
        'Unable to load appointments from the database.'
      );
    }

    /* =====================================
       READ API RESPONSE
    ===================================== */

    let result: AdminAppointmentsResponse;

    try {
      result =
        (await response.json()) as
          AdminAppointmentsResponse;
    } catch {
      throw new Error(
        'Invalid appointment data received.'
      );
    }

    /* =====================================
       VERIFY RESPONSE STRUCTURE
    ===================================== */

    if (
      !result ||

      result.success !== true ||

      !Array.isArray(
        result.appointments
      )
    ) {
      throw new Error(
        'Invalid appointment data received.'
      );
    }

    /* =====================================
       RETURN SERVER APPOINTMENT DATA

       Preserve all payment fields exactly
       as returned by the authenticated API.

       In particular:

       - depositPaid
       - balancePaid
       - totalPaid
       - balanceDue
       - paymentState
       - paymentNeedsReview

       Never overwrite these values with
       frontend deposit-only calculations.
    ===================================== */

    return result.appointments;
  };

/* =====================================
   LEGACY APPOINTMENT STATUS FUNCTION

   Preserve existing behavior.

   Appointment decisions must use the
   secure administrator workflow.
===================================== */

export const updateAppointmentStatus =
  async (
    _appointmentId: string,
    _status: string
  ) => {
    throw new Error(
      'Confirm appointments from the secure link in the notification email.'
    );
  };

/* =====================================
   LEGACY APPOINTMENT LOOKUP
===================================== */

export const getAppointmentById =
  async () => null;

/* =====================================
   LEGACY BLOCKED DATE FUNCTIONS
===================================== */

export const addBlockedDate =
  async (
    _date: string,
    _reason?: string
  ) => null;

export const removeBlockedDate =
  async (
    _id: string
  ) => undefined;

/* =====================================
   LEGACY BLOCKED TIME FUNCTIONS
===================================== */

export const addBlockedTime =
  async (
    _time: string,
    _date: string
  ) => null;

export const removeBlockedTime =
  async (
    _id: string
  ) => undefined;
