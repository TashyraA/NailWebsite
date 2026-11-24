
import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  CheckCircle,
  Clock,
  DollarSign,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/* =========================================
   INLOVENAILZ BY BRIANA
   BOOKING CONFIRMATION

   - Verifies Neon deposit status via API
   - Never trusts a Stripe redirect alone
   - Supports pending webhook processing
   - Does not claim emails were sent
   - Does not expose private booking details
   - Preserves the pink confirmation design
========================================= */

type PaymentStatusResponse = {
  success: boolean;
  paymentStatus?: 'confirmed' | 'pending';
  appointmentStatus?: string;
  totalAmount?: number;
  depositAmount?: number;
  depositPaid?: number;
  balanceDue?: number;
  error?: string;
};

type PageStatus =
  | 'loading'
  | 'confirmed'
  | 'pending'
  | 'error'
  | 'missing';

const MAX_CHECKS = 6;
const CHECK_INTERVAL_MS = 3000;

function money(value: number | undefined): string {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value)
  ) {
    return '$0.00';
  }

  return `$${value.toFixed(2)}`;
}

const BookingConfirmation = () => {
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const sessionId = params.get('session_id');
  const depositReturn = params.get('deposit');

  const [pageStatus, setPageStatus] =
    useState<PageStatus>(
      sessionId && depositReturn === 'success'
        ? 'loading'
        : 'missing'
    );

  const [payment, setPayment] =
    useState<PaymentStatusResponse | null>(null);

  const [errorMessage, setErrorMessage] =
    useState<string>('');

  useEffect(() => {
    if (
      !sessionId ||
      depositReturn !== 'success'
    ) {
      setPageStatus('missing');
      setPayment(null);
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null =
      null;

    const controller = new AbortController();

    const checkPayment = async (
      attempt: number
    ): Promise<void> => {
      try {
        const response = await fetch(
          `/api/booking-payment-status?session_id=${encodeURIComponent(
            sessionId
          )}`,
          {
            method: 'GET',
            cache: 'no-store',
            signal: controller.signal,
          }
        );

        const result =
          (await response.json()) as PaymentStatusResponse;

        if (cancelled) {
          return;
        }

        if (!response.ok || !result.success) {
          setErrorMessage(
            result.error ||
              'We could not verify your payment right now.'
          );
          setPageStatus('error');
          return;
        }

        setPayment(result);

        if (result.paymentStatus === 'confirmed') {
          setPageStatus('confirmed');
          return;
        }

        if (attempt >= MAX_CHECKS) {
          setPageStatus('pending');
          return;
        }

        setPageStatus('loading');

        timeoutId = setTimeout(() => {
          void checkPayment(attempt + 1);
        }, CHECK_INTERVAL_MS);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setErrorMessage(
          'We could not check your payment status. Please try again shortly.'
        );
        setPageStatus('error');
      }
    };

    setPageStatus('loading');
    setPayment(null);
    setErrorMessage('');

    void checkPayment(1);

    return () => {
      cancelled = true;
      controller.abort();

      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [sessionId, depositReturn]);

  const isConfirmed = pageStatus === 'confirmed';

  const isLoading = pageStatus === 'loading';

  const isPending = pageStatus === 'pending';

  const isError = pageStatus === 'error';

  const title = isConfirmed
    ? 'Booking Confirmed!'
    : isLoading
      ? 'Verifying Your Payment'
      : isPending
        ? 'Confirmation Pending'
        : isError
          ? 'Unable to Verify Payment'
          : 'Booking Information Unavailable';

  const subtitle = isConfirmed
    ? 'Your deposit has been verified and your appointment is confirmed.'
    : isLoading
      ? 'We are checking your payment and appointment status. This may take a moment.'
      : isPending
        ? 'Your appointment has not yet been confirmed in our system. Please wait for confirmation before considering it booked.'
        : isError
          ? 'We could not confirm your appointment status at this time.'
          : 'Please use the payment link provided by the salon to complete your booking.';

  const handleCheckAgain = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFE9EF] via-[#FFC9D7] to-[#FFBCCD]">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div
              className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
                isConfirmed
                  ? 'bg-gradient-to-r from-green-400 to-green-600'
                  : 'bg-gradient-to-r from-[#FF8CAA] to-[#FF6B96]'
              }`}
            >
              {isConfirmed ? (
                <CheckCircle
                  className="text-white"
                  size={48}
                />
              ) : isLoading ? (
                <Loader2
                  className="text-white animate-spin"
                  size={44}
                />
              ) : isPending ? (
                <Clock
                  className="text-white"
                  size={44}
                />
              ) : (
                <AlertCircle
                  className="text-white"
                  size={44}
                />
              )}
            </div>

            <h1 className="text-4xl font-bold mb-2 text-gray-800">
              {title}
            </h1>

            <p className="text-gray-600 text-lg">
              {subtitle}
            </p>

            {isConfirmed && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-green-700 font-medium">
                  ✓ Your appointment and deposit are
                  confirmed in our booking system.
                </p>
                <p className="text-green-700 text-sm mt-2">
                  Your confirmation email may arrive
                  separately.
                </p>
              </div>
            )}

            {isPending && (
              <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-yellow-800 font-medium">
                  We are still waiting for final
                  confirmation.
                </p>
                <p className="text-yellow-800 text-sm mt-2">
                  Please do not make another deposit
                  payment while this one is being
                  checked.
                </p>
              </div>
            )}

            {isError && (
              <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-red-700">
                  {errorMessage}
                </p>
                <p className="text-red-700 text-sm mt-2">
                  If you completed payment, please
                  do not pay again until the salon
                  verifies your transaction.
                </p>
              </div>
            )}
          </div>

          {payment && (
            <Card className="p-8 mb-6 bg-[#FFE9EF]">
              <div className="flex items-center gap-3 mb-4">
                <DollarSign
                  className="text-pink-600"
                  size={24}
                />
                <h2 className="text-lg font-bold text-gray-800">
                  Payment Summary
                </h2>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between gap-4">
                  <span className="text-gray-600">
                    Total Amount
                  </span>
                  <span className="font-medium text-gray-800">
                    {money(payment.totalAmount)}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-gray-600">
                    Required Deposit
                  </span>
                  <span className="font-medium text-gray-800">
                    {money(payment.depositAmount)}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-gray-600">
                    Verified Deposit Paid
                  </span>
                  <span
                    className={
                      isConfirmed
                        ? 'font-semibold text-green-600'
                        : 'font-semibold text-gray-700'
                    }
                  >
                    {money(payment.depositPaid)}
                  </span>
                </div>

                {isConfirmed && (
                  <div className="flex justify-between gap-4 border-t pt-3 text-pink-600 text-lg font-bold">
                    <span>
                      Balance Due at Appointment
                    </span>
                    <span>
                      {money(payment.balanceDue)}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          )}

          {isConfirmed && (
            <Card className="p-8 mb-6">
              <h2 className="text-xl font-bold mb-4 text-gray-800">
                Your Appointment
              </h2>

              <div className="space-y-3 text-gray-600">
                <p>
                  Your booking has been confirmed
                  successfully.
                </p>

                <p>
                  Please refer to your appointment
                  confirmation email for your
                  scheduled date, time, and services.
                </p>

                <p>
                  Please arrive on time for your
                  scheduled appointment.
                </p>
              </div>
            </Card>
          )}

          {isLoading && (
            <Card className="p-6 mb-6 text-center">
              <p className="text-gray-700">
                Checking for your verified booking
                confirmation...
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Please keep this page open while
                we check.
              </p>
            </Card>
          )}

          {(isPending || isError) && (
            <Card className="p-6 mb-6">
              <h2 className="font-semibold text-gray-800 mb-2">
                What Should I Do Next?
              </h2>

              <p className="text-gray-600 text-sm mb-4">
                You can check the payment status
                again. If it still cannot be
                confirmed, contact the salon before
                attempting another payment.
              </p>

              <Button
                onClick={handleCheckAgain}
                className="w-full bg-[#FF8CAA] hover:bg-[#FF6B96] text-white"
              >
                Check Payment Status Again
              </Button>
            </Card>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">
              Important Information
            </h3>

            <ul className="text-sm text-blue-800 space-y-2">
              {isConfirmed ? (
                <>
                  <li>
                    ✓ Your deposit has been verified.
                  </li>
                  <li>
                    ✓ Your remaining balance is{' '}
                    {money(payment?.balanceDue)}.
                  </li>
                  <li>
                    ✓ Please arrive on time for your
                    scheduled appointment.
                  </li>
                </>
              ) : (
                <>
                  <li>
                    • A Stripe return page alone does
                    not confirm your appointment.
                  </li>
                  <li>
                    • Wait for the salon's verified
                    booking confirmation.
                  </li>
                  <li>
                    • Do not submit a second payment
                    without checking the first one.
                  </li>
                </>
              )}
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/" className="flex-1">
              <Button
                className="w-full"
                variant="outline"
              >
                Return Home
              </Button>
            </Link>

            <Link
              to="/services"
              className="flex-1"
            >
              <Button
                className="w-full bg-[#FF8CAA] hover:bg-[#FF6B96] text-white font-semibold"
                disabled={!isConfirmed}
              >
                Book Another Service
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;
