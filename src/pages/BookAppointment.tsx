
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Heart,
  ImagePlus,
  Loader2,
  ShoppingBag,
  Sparkles,
  UploadCloud,
  UserRound,
  X,
} from 'lucide-react';

import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

import {
  formatDateForBooking,
  formatTime,
  getAvailableTimes,
} from '@/utils/availability';

/* =========================================
   INLOVENAILZ BY BRIANA
   RESPONSIVE BOOK APPOINTMENT PAGE

   - Mobile-safe date input
   - Responsive form fields
   - Full mobile/tablet hero image
   - Shorter 300px desktop hero
   - Responsive inspiration upload
   - Appointment request without payment
   - Existing API endpoint retained
========================================= */

const MAX_IMAGE_SIZE = 3 * 1024 * 1024;

const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

const inputStyles = `
  mt-2 block h-12
  w-full min-w-0 max-w-full
  rounded-xl
  border-[#EAC5D0]
  bg-[#FFF9FA]
  text-base
  text-[#29252B]
  focus-visible:ring-[#963F60]
  sm:text-sm
`;

const BookAppointment: React.FC = () => {
  const { items, getTotalPrice } = useCart();
  const { toast } = useToast();

  /* =====================================
     APPOINTMENT STATE
  ===================================== */

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [inspirationUrl, setInspirationUrl] = useState('');
  const [inspirationName, setInspirationName] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  });

  /* =====================================
     APPOINTMENT CALCULATIONS
  ===================================== */

  const selectedDate = useMemo(() => {
    if (!date) return undefined;
    return new Date(`${date}T12:00:00`);
  }, [date]);

  const availableTimes = useMemo(() => {
    if (!selectedDate) return [];
    return getAvailableTimes(selectedDate);
  }, [selectedDate]);

  const total = getTotalPrice();

  const totalDuration = items.reduce(
    (sum, item) =>
      sum + item.service.duration * item.quantity,
    0
  );

  const serviceCount = items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const minDate = formatDateForBooking(
    new Date(Date.now() + 24 * 60 * 60 * 1000)
  );

  const formattedSelectedDate = selectedDate
    ? selectedDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  /* =====================================
     FORM HELPERS
  ===================================== */

  const updateForm = (
    field: keyof typeof form,
    value: string
  ) => {
    setForm(current => ({
      ...current,
      [field]: value,
    }));
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;

    if (hours === 0) return `${remaining} min`;
    if (remaining === 0) return `${hours} hr`;

    return `${hours} hr ${remaining} min`;
  };

  /* =====================================
     INSPIRATION IMAGE UPLOAD
  ===================================== */

  const handleInspirationUpload = async (
    file?: File
  ) => {
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast({
        title: 'Unsupported image',
        description:
          'Please choose a JPG, PNG, or WebP image.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast({
        title: 'Image is too large',
        description:
          'Please choose an image smaller than 3 MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setInspirationUrl('');
    setInspirationName('');

    try {
      const dataUrl = await new Promise<string>(
        (resolve, reject) => {
          const reader = new FileReader();

          reader.onload = () =>
            resolve(String(reader.result));

          reader.onerror = () =>
            reject(
              new Error('Could not read the image')
            );

          reader.readAsDataURL(file);
        }
      );

      const response = await fetch(
        '/api/upload-image',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dataUrl,
            folder: 'inlovenailz/inspiration',
          }),
        }
      );

      const responseText = await response.text();

      let result: {
        url?: string;
        error?: string;
      };

      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(
          'The image upload server returned an invalid response.'
        );
      }

      if (!response.ok || !result.url) {
        throw new Error(
          result.error ||
            'Could not upload inspiration image.'
        );
      }

      setInspirationUrl(result.url);
      setInspirationName(file.name);

      toast({
        title: 'Photo uploaded!',
        description:
          'Your inspiration photo has been added.',
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Please try uploading again.';

      toast({
        title: 'Upload failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeInspiration = () => {
    setInspirationUrl('');
    setInspirationName('');
  };

  /* =====================================
     SUBMIT APPOINTMENT REQUEST
  ===================================== */

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (items.length === 0) {
      toast({
        title: 'No services selected',
        description:
          'Please add at least one service.',
        variant: 'destructive',
      });
      return;
    }

    if (!date || !time) {
      toast({
        title: 'Choose an appointment time',
        description:
          'Please select your preferred date and time.',
        variant: 'destructive',
      });
      return;
    }

    if (!availableTimes.includes(time)) {
      toast({
        title: 'Invalid appointment time',
        description:
          'Please select one of the available time slots.',
        variant: 'destructive',
      });
      return;
    }

    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.phone.trim()
    ) {
      toast({
        title: 'Complete your details',
        description:
          'Please enter your name, email, and phone number.',
        variant: 'destructive',
      });
      return;
    }

    if (isUploading) {
      toast({
        title: 'Photo is uploading',
        description:
          'Please wait for your photo to finish uploading.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        '/api/request-appointment',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customerName: form.name.trim(),
            customerEmail: form.email.trim(),
            customerPhone: form.phone.trim(),
            notes: form.notes.trim(),
            inspirationUrl,
            appointmentDate: date,
            appointmentTime: time,
            services: items,
            totalPrice: total,
          }),
        }
      );

      const responseText = await response.text();

      let result: {
        success?: boolean;
        error?: string;
      };

      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(
          responseText ||
            `Server returned ${response.status}`
        );
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            'Unable to submit your appointment request.'
        );
      }

      setRequestSent(true);

      toast({
        title: 'Appointment request received!',
        description:
          'Briana will review your request and contact you with the next steps.',
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Please try again.';

      toast({
        title: 'Request could not be sent',
        description: message,
        variant: 'destructive',
      });

      setIsSubmitting(false);
    }
  };

  /* =====================================
     SUCCESS STATE
  ===================================== */

  if (requestSent) {
    return (
      <main className="flex min-h-[70vh] min-w-0 items-center justify-center bg-[#FFF7F8] px-3 py-12 sm:px-5 sm:py-20">
        <div className="w-full max-w-lg min-w-0 rounded-[22px] border border-[#F7DDE4] bg-white px-5 py-9 text-center shadow-lg sm:rounded-3xl sm:p-10">
          <CheckCircle2
            size={52}
            className="mx-auto mb-5 text-[#963F60]"
          />

          <h1 className="font-serif text-2xl font-semibold text-[#29252B] sm:text-3xl">
            Appointment Request Received!
          </h1>

          <p className="mt-4 break-words text-sm leading-relaxed text-[#765E6B]">
            Thank you for choosing InLoveNailz by Briana!
            Your appointment request has been submitted
            successfully.
          </p>

          <p className="mt-3 text-sm leading-relaxed text-[#765E6B]">
            Briana will review your request and contact
            you with the next steps.
          </p>

          <p className="mt-3 text-sm font-semibold leading-relaxed text-[#963F60]">
            Your appointment is not confirmed until
            you receive an official confirmation.
          </p>

          <Link
            to="/services"
            className="mt-7 inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#963F60] px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#7D3250]"
          >
            Back to Services
          </Link>
        </div>
      </main>
    );
  }

  /* =====================================
     EMPTY CART
  ===================================== */

  if (items.length === 0) {
    return (
      <main className="flex min-h-screen min-w-0 items-center justify-center bg-gradient-to-b from-[#FFF7F8] to-[#F7DDE4] px-3 py-12 sm:px-4 sm:py-20">
        <div className="w-full max-w-[520px] min-w-0 rounded-[22px] border border-[#EAC5D0] bg-white/90 px-5 py-9 text-center shadow-[0_15px_40px_rgba(112,43,68,0.1)] sm:rounded-[28px] sm:px-7 sm:py-12">

          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#F7DDE4] text-[#963F60] sm:h-20 sm:w-20">
            <ShoppingBag size={34} />
          </div>

          <h1 className="font-serif text-2xl text-[#29252B] sm:text-3xl">
            Your Booking Is Empty
          </h1>

          <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-[#766D73]">
            Your perfect nail appointment starts
            with choosing your favorite services.
          </p>

          <Link
            to="/services"
            className="mt-7 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-[#963F60] px-5 py-3 text-xs font-semibold text-white transition-colors hover:bg-[#7D3250] sm:gap-3 sm:px-8 sm:text-sm"
          >
            Browse Nail Services
            <ArrowRight size={17} />
          </Link>
        </div>
      </main>
    );
  }

  /* =====================================
     MAIN BOOKING PAGE
  ===================================== */

  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-clip bg-gradient-to-b from-[#FFF7F8] via-[#FFF0F3] to-[#F7DDE4] text-[#29252B]">

      {/* =====================================
          RESPONSIVE BOOKING BANNER

          Mobile / tablet:
          Full image visible.

          Desktop (1024px+):
          Shorter 300px banner.
      ===================================== */}

      <section className="relative isolate w-full overflow-hidden text-white lg:h-[300px]">
        <img
          src="/service-banner.png"
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          className="block h-auto w-full lg:h-full lg:object-cover lg:object-center"
        />

        <div
          className="pointer-events-none absolute inset-0 bg-[#3A1425]/55"
          aria-hidden="true"
        />

        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-3 py-2 text-center sm:px-5">
          <p className="mb-2 flex items-center justify-center gap-1.5 text-[clamp(7px,1.6vw,12px)] font-semibold uppercase tracking-[0.12em] text-white/90 sm:mb-4 sm:gap-2 sm:tracking-[0.28em]">
            <Heart
              size={13}
              className="shrink-0 sm:h-[15px] sm:w-[15px]"
            />
            InLoveNailz by Briana
          </p>

          <h1 className="max-w-full font-serif text-[clamp(1.4rem,6vw,4.8rem)] leading-[1.1] text-white">
            Book Your Appointment
          </h1>
        </div>
      </section>

      {/* =====================================
          BOOKING CONTENT
      ===================================== */}

      <section className="w-full min-w-0 px-3 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <div className="mx-auto w-full max-w-[1180px] min-w-0">

          {/* BACK TO SERVICES */}

          <Link
            to="/services"
            className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-[#963F60] transition-colors hover:text-[#7D3250] sm:mb-8 sm:text-sm"
          >
            <ArrowLeft size={17} />
            Back to Services
          </Link>

          {/* RESPONSIVE PAGE GRID */}

          <div className="grid min-w-0 grid-cols-1 items-start gap-5 sm:gap-7 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-8">

            {/* =====================================
                LEFT COLUMN
            ===================================== */}

            <div className="min-w-0 space-y-5 sm:space-y-7">

              {/* SERVICE SUMMARY */}

              <div className="min-w-0 overflow-hidden rounded-[18px] border border-[#EAC5D0] bg-white/95 shadow-[0_10px_30px_rgba(112,43,68,0.08)] sm:rounded-[24px]">

                <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-[#F0DCE3] px-4 py-4 sm:px-6 sm:py-5">
                  <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                    <ShoppingBag
                      size={21}
                      className="shrink-0 text-[#963F60]"
                    />

                    <h2 className="font-serif text-xl text-[#29252B] sm:text-2xl">
                      Your Services
                    </h2>
                  </div>

                  <span className="shrink-0 rounded-full bg-[#F7DDE4] px-3 py-1 text-[10px] font-semibold text-[#963F60] sm:text-xs">
                    {serviceCount}{' '}
                    {serviceCount === 1
                      ? 'Service'
                      : 'Services'}
                  </span>
                </div>

                {/* SELECTED SERVICES */}

                <div className="space-y-4 px-4 py-5 sm:space-y-5 sm:px-6 sm:py-6">
                  {items.map(({ service, quantity }) => (
                    <div
                      key={service.id}
                      className="flex min-w-0 items-start justify-between gap-2 sm:gap-4"
                    >
                      <div className="flex min-w-0 flex-1 gap-2 sm:gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FFF0F3] text-[#963F60] sm:h-11 sm:w-11 sm:rounded-xl">
                          <Sparkles size={18} />
                        </div>

                        <div className="min-w-0">
                          <p className="break-words text-xs font-semibold leading-snug text-[#29252B] sm:text-sm">
                            {service.title}
                          </p>

                          <p className="mt-1 text-[10px] text-[#8E7A85] sm:text-xs">
                            {formatDuration(
                              service.duration
                            )}

                            {quantity > 1 &&
                              ` × ${quantity}`}
                          </p>
                        </div>
                      </div>

                      <span className="shrink-0 text-xs font-bold text-[#963F60] sm:text-sm">
                        $
                        {(
                          service.price * quantity
                        ).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* PRICE SUMMARY */}

                <div className="space-y-3 border-t border-[#F0DCE3] bg-[#FFF7F8] px-4 py-5 sm:px-6 sm:py-6">
                  <div className="flex items-center justify-between gap-3 text-xs text-[#623848] sm:text-sm">
                    <span>Service Total</span>
                    <span className="shrink-0 font-semibold">
                      ${total.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-xs text-[#623848] sm:text-sm">
                    <span>Estimated Duration</span>
                    <span className="shrink-0 font-semibold">
                      {formatDuration(totalDuration)}
                    </span>
                  </div>

                  <p className="border-t border-[#EAC5D0] pt-4 text-xs leading-relaxed text-[#765E6B] sm:text-sm">
                    Your selected services and preferred
                    appointment time will be reviewed
                    by Briana before your appointment
                    is confirmed.
                  </p>
                </div>
              </div>

              {/* =====================================
                  CHOOSE DATE & TIME
              ===================================== */}

              <div className="w-full min-w-0 overflow-hidden rounded-[18px] border border-[#EAC5D0] bg-white/95 p-4 shadow-[0_10px_30px_rgba(112,43,68,0.08)] sm:rounded-[24px] sm:p-6">

                <div className="mb-5 flex min-w-0 items-center gap-2 sm:mb-6 sm:gap-3">
                  <CalendarCheck2
                    size={22}
                    className="shrink-0 text-[#963F60]"
                  />

                  <h2 className="min-w-0 font-serif text-xl leading-tight text-[#29252B] sm:text-2xl">
                    Choose Date & Time
                  </h2>
                </div>

                {/* MOBILE-SAFE DATE FIELD */}

                <div className="w-full min-w-0 max-w-full overflow-hidden">
                  <Label
                    htmlFor="appointment-date"
                    className="block text-xs font-semibold leading-relaxed text-[#623848] sm:text-sm"
                  >
                    Preferred Appointment Date
                  </Label>

                  <div className="mt-2 w-full min-w-0 max-w-full overflow-hidden rounded-xl">
                    <input
                      id="appointment-date"
                      type="date"
                      value={date}
                      min={minDate}
                      onChange={event => {
                        setDate(event.target.value);
                        setTime('');
                      }}
                      className="
                        block h-12
                        w-full min-w-0 max-w-full
                        appearance-none
                        rounded-xl
                        border border-[#EAC5D0]
                        bg-[#FFF9FA]
                        px-3
                        text-[16px]
                        text-[#29252B]
                        outline-none
                        transition-colors
                        focus:border-[#963F60]
                        focus:ring-2
                        focus:ring-[#963F60]/20
                        [box-sizing:border-box]
                        [&::-webkit-date-and-time-value]:min-w-0
                        [&::-webkit-date-and-time-value]:text-left
                      "
                      style={{
                        minWidth: 0,
                        maxWidth: '100%',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* AVAILABLE TIMES */}

                <div className="mt-6 min-w-0 sm:mt-7">
                  <div className="mb-3 flex min-w-0 items-center gap-2">
                    <Clock3
                      size={18}
                      className="shrink-0 text-[#963F60]"
                    />

                    <Label className="min-w-0 text-xs font-semibold leading-snug text-[#623848] sm:text-sm">
                      Available Appointment Times
                    </Label>
                  </div>

                  <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                    {availableTimes.length > 0 ? (
                      availableTimes.map(slot => {
                        const isSelected = time === slot;

                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setTime(slot)}
                            aria-pressed={isSelected}
                            className={`
                              min-h-[42px] min-w-0
                              rounded-xl border
                              px-1.5 py-2
                              text-[11px] font-semibold
                              transition-all duration-200
                              sm:min-h-[45px]
                              sm:px-3 sm:text-sm
                              ${
                                isSelected
                                  ? `
                                    border-[#963F60]
                                    bg-[#963F60]
                                    text-white
                                    shadow-md
                                  `
                                  : `
                                    border-[#EAC5D0]
                                    bg-[#FFF7F8]
                                    text-[#702B44]
                                    hover:border-[#963F60]
                                    hover:bg-[#F7DDE4]
                                  `
                              }
                            `}
                          >
                            {formatTime(slot)}
                          </button>
                        );
                      })
                    ) : (
                      <p className="col-span-full rounded-xl bg-[#FFF7F8] px-3 py-5 text-center text-xs leading-relaxed text-[#8E7A85] sm:px-4 sm:py-6 sm:text-sm">
                        {date
                          ? 'No appointment times are available for this date. Please choose another day.'
                          : 'Select your preferred date to see available appointment times.'}
                      </p>
                    )}
                  </div>
                </div>

                {/* SELECTED APPOINTMENT */}

                {date && time && (
                  <div className="mt-5 min-w-0 rounded-xl border border-[#EAC5D0] bg-[#F7DDE4]/60 p-3 sm:mt-6 sm:p-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <CheckCircle2
                        size={20}
                        className="mt-0.5 shrink-0 text-[#963F60]"
                      />

                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#963F60] sm:text-sm">
                          Preferred Appointment
                        </p>

                        <p className="mt-1 break-words text-xs text-[#623848] sm:text-sm">
                          {formattedSelectedDate}
                        </p>

                        <p className="mt-1 text-xs font-semibold text-[#623848] sm:text-sm">
                          {formatTime(time)}
                        </p>

                        <p className="mt-2 text-[11px] leading-relaxed text-[#765E6B] sm:text-xs">
                          This is your requested time.
                          Your appointment is not yet confirmed.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* =====================================
                RIGHT COLUMN
                CUSTOMER INFORMATION
            ===================================== */}

            <div className="w-full min-w-0 overflow-hidden rounded-[18px] border border-[#EAC5D0] bg-white/95 p-4 shadow-[0_10px_30px_rgba(112,43,68,0.08)] sm:rounded-[24px] sm:p-8">

              {/* HEADER */}

              <div className="mb-6 flex min-w-0 items-center gap-3 border-b border-[#F0DCE3] pb-5 sm:mb-7 sm:pb-6">
                <UserRound
                  size={23}
                  className="shrink-0 text-[#963F60]"
                />

                <div className="min-w-0">
                  <h2 className="font-serif text-xl text-[#29252B] sm:text-2xl">
                    Your Information
                  </h2>

                  <p className="mt-1 text-xs text-[#8E7A85]">
                    Tell us a little about yourself.
                  </p>
                </div>
              </div>

              {/* CUSTOMER FORM */}

              <form
                onSubmit={handleSubmit}
                className="w-full min-w-0 space-y-5 sm:space-y-6"
              >

                {/* FULL NAME */}

                <div className="w-full min-w-0">
                  <Label
                    htmlFor="name"
                    className="text-sm font-semibold text-[#623848]"
                  >
                    Full Name *
                  </Label>

                  <Input
                    id="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Enter your full name"
                    value={form.name}
                    onChange={event =>
                      updateForm(
                        'name',
                        event.target.value
                      )
                    }
                    required
                    className={inputStyles}
                  />
                </div>

                {/* EMAIL */}

                <div className="w-full min-w-0">
                  <Label
                    htmlFor="email"
                    className="text-sm font-semibold text-[#623848]"
                  >
                    Email Address *
                  </Label>

                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={event =>
                      updateForm(
                        'email',
                        event.target.value
                      )
                    }
                    required
                    className={inputStyles}
                  />
                </div>

                {/* PHONE */}

                <div className="w-full min-w-0">
                  <Label
                    htmlFor="phone"
                    className="text-sm font-semibold text-[#623848]"
                  >
                    Phone Number *
                  </Label>

                  <Input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="(555) 555-5555"
                    value={form.phone}
                    onChange={event =>
                      updateForm(
                        'phone',
                        event.target.value
                      )
                    }
                    required
                    className={inputStyles}
                  />
                </div>

                {/* APPOINTMENT NOTES */}

                <div className="w-full min-w-0">
                  <Label
                    htmlFor="notes"
                    className="text-sm font-semibold text-[#623848]"
                  >
                    Appointment Notes

                    <span className="ml-2 text-xs font-normal text-[#9B8791]">
                      Optional
                    </span>
                  </Label>

                  <Textarea
                    id="notes"
                    placeholder="Tell us about your nail ideas, preferred designs, or anything we should know..."
                    value={form.notes}
                    onChange={event =>
                      updateForm(
                        'notes',
                        event.target.value
                      )
                    }
                    rows={4}
                    className="
                      mt-2 block w-full
                      min-w-0 max-w-full
                      resize-none rounded-xl
                      border-[#EAC5D0]
                      bg-[#FFF9FA]
                      text-base
                      focus-visible:ring-[#963F60]
                      sm:text-sm
                    "
                  />
                </div>

                {/* =====================================
                    INSPIRATION PHOTO
                ===================================== */}

                <div className="w-full min-w-0 border-t border-[#F0DCE3] pt-6">

                  <div className="mb-3 flex min-w-0 items-center gap-2">
                    <ImagePlus
                      size={20}
                      className="shrink-0 text-[#963F60]"
                    />

                    <Label
                      htmlFor="inspiration-image"
                      className="min-w-0 text-xs font-semibold text-[#623848] sm:text-sm"
                    >
                      Nail Inspiration Photo
                    </Label>
                  </div>

                  <p className="mb-4 text-xs leading-relaxed text-[#8E7A85]">
                    Have a nail design in mind?
                    Upload a photo so Briana can
                    see your inspiration.
                  </p>

                  {/* UPLOAD AREA */}

                  {!inspirationUrl && (
                    <div className="w-full min-w-0 overflow-hidden rounded-2xl border-2 border-dashed border-[#E5B6C5] bg-[#FFF7F8] p-3 text-center sm:p-6">

                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#F7DDE4] text-[#963F60]">
                        {isUploading ? (
                          <Loader2
                            size={23}
                            className="animate-spin"
                          />
                        ) : (
                          <UploadCloud size={23} />
                        )}
                      </div>

                      <p className="text-xs font-semibold text-[#623848] sm:text-sm">
                        {isUploading
                          ? 'Uploading your photo...'
                          : 'Upload Your Inspiration'}
                      </p>

                      <p className="mt-2 text-[11px] text-[#8E7A85] sm:text-xs">
                        JPG, PNG, or WebP • Max 3 MB
                      </p>

                      <Input
                        id="inspiration-image"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={
                          isUploading || isSubmitting
                        }
                        onChange={event => {
                          void handleInspirationUpload(
                            event.target.files?.[0]
                          );

                          event.target.value = '';
                        }}
                        className="
                          mt-4 block h-auto
                          w-full min-w-0 max-w-full
                          cursor-pointer
                          overflow-hidden
                          rounded-xl
                          border-[#EAC5D0]
                          bg-white
                          p-1.5
                          text-[10px]
                          file:mr-2
                          file:rounded-lg
                          file:border-0
                          file:bg-[#F7DDE4]
                          file:px-2
                          file:py-2
                          file:text-[10px]
                          file:text-[#963F60]
                          sm:p-2
                          sm:text-xs
                          sm:file:mr-3
                          sm:file:px-3
                          sm:file:text-xs
                        "
                      />
                    </div>
                  )}

                  {/* IMAGE PREVIEW */}

                  {inspirationUrl && (
                    <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-[#EAC5D0] bg-[#FFF7F8] p-3 sm:p-4">
                      <div className="relative min-w-0">
                        <img
                          src={inspirationUrl}
                          alt="Your nail inspiration"
                          className="block max-h-[260px] w-full rounded-xl object-contain"
                        />

                        <button
                          type="button"
                          onClick={removeInspiration}
                          disabled={isSubmitting}
                          aria-label="Remove inspiration photo"
                          className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#963F60] shadow-md transition-colors hover:bg-[#F7DDE4]"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <div className="mt-3 flex min-w-0 items-center gap-2 text-xs text-[#623848]">
                        <CheckCircle2
                          size={16}
                          className="shrink-0 text-[#963F60]"
                        />

                        <span className="min-w-0 truncate">
                          {inspirationName}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* =====================================
                    REQUEST APPOINTMENT BUTTON
                ===================================== */}

                <Button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    isUploading ||
                    !date ||
                    !time
                  }
                  className="
                    h-12 w-full min-w-0
                    max-w-full
                    rounded-full
                    bg-[#963F60]
                    px-3
                    text-xs font-semibold
                    text-white
                    shadow-lg
                    shadow-[#963F60]/20
                    transition-all duration-300
                    hover:-translate-y-1
                    hover:bg-[#69263F]
                    hover:shadow-[0_12px_28px_rgba(150,63,96,0.40)]
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-[#963F60]
                    focus-visible:ring-offset-2
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                    disabled:hover:translate-y-0
                    disabled:hover:bg-[#963F60]
                    disabled:hover:shadow-lg
                    sm:h-14
                    sm:text-sm
                  "
                >
                  {isSubmitting ? (
                    <span className="inline-flex min-w-0 items-center justify-center gap-2">
                      <Loader2
                        size={18}
                        className="shrink-0 animate-spin"
                      />

                      Sending Request...
                    </span>
                  ) : (
                    <span className="inline-flex min-w-0 items-center justify-center gap-2">
                      <ArrowRight
                        size={17}
                        className="shrink-0"
                      />

                      Request Appointment

                      <ArrowRight
                        size={16}
                        className="shrink-0"
                      />
                    </span>
                  )}
                </Button>

                {/* APPOINTMENT REVIEW NOTE */}

                <p className="text-center text-[11px] leading-relaxed text-[#8E7A85] sm:text-xs">
                  Your request will be reviewed by Briana.
                  You will be contacted with the next steps.
                </p>
              </form>
            </div>
          </div>

          {/* =====================================
              BOTTOM TRUST NOTES
          ===================================== */}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-[10px] text-[#8E7A85] sm:mt-10 sm:gap-x-6 sm:text-xs">
            <span className="flex items-center gap-2">
              <CalendarDays
                size={16}
                className="shrink-0 text-[#963F60]"
              />
              Easy Appointment Requests
            </span>

            <span className="flex items-center gap-2">
              <CheckCircle2
                size={16}
                className="shrink-0 text-[#963F60]"
              />
              Personal Appointment Review
            </span>

            <span className="flex items-center gap-2">
              <Heart
                size={16}
                className="shrink-0 text-[#963F60]"
              />
              Made With Love
            </span>
          </div>
        </div>
      </section>
    </main>
  );
};

export default BookAppointment;
