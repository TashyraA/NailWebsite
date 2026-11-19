
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
  ShieldCheck,
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
   BOOK APPOINTMENT PAGE

   Deposit: $20 PER APPOINTMENT
========================================= */

const BOOKING_DEPOSIT = 20;

const MAX_IMAGE_SIZE = 3 * 1024 * 1024;

const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

const BookAppointment: React.FC = () => {
  const {
    items,
    getTotalPrice,
  } = useCart();

  const { toast } = useToast();

  /* =====================================
     APPOINTMENT STATE
  ===================================== */

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [requestSent, setRequestSent] = useState(false);

  const [isUploading, setIsUploading] =
    useState(false);

  const [inspirationUrl, setInspirationUrl] =
    useState('');

  const [inspirationName, setInspirationName] =
    useState('');

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

  // One deposit for the entire appointment.
  // Multiple services do NOT increase it.
  const deposit = Math.min(
    BOOKING_DEPOSIT,
    Math.max(0, total)
  );

  const balance = Math.max(
    0,
    total - deposit
  );

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
    const remainingMinutes = minutes % 60;

    if (hours === 0) {
      return `${remainingMinutes} min`;
    }

    if (remainingMinutes === 0) {
      return `${hours} hr`;
    }

    return `${hours} hr ${remainingMinutes} min`;
  };

  const formattedSelectedDate = selectedDate
    ? selectedDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

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
     EMAIL DEPOSIT LINK
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

            // $20 once per appointment.
            depositPaid: deposit,

            balanceDue: balance,
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
            'Unable to email your deposit link.'
        );
      }

      setRequestSent(true);
      toast({ title: 'Request received', description: 'Check your email for your secure $20 deposit link.' });
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
     EMPTY CART
  ===================================== */

  if (requestSent) {
    return (
      <div className="min-h-[70vh] bg-[#FFF7F8] flex items-center justify-center px-5 py-20">
        <div className="w-full max-w-lg rounded-3xl bg-white border border-[#F7DDE4] p-10 text-center shadow-lg">
          <CheckCircle2 className="mx-auto mb-5 text-[#963F60]" size={52} />
          <h1 className="text-3xl font-semibold text-[#29252B]">Check Your Email</h1>
          <p className="mt-4 text-[#765E6B]">We sent your secure $20 deposit payment link to <strong>{form.email}</strong>.</p>
          <p className="mt-3 text-sm text-[#765E6B]">Your appointment is not confirmed. After payment, Briana will review your request and email you a decision.</p>
          <Link to="/services" className="mt-7 inline-flex rounded-full bg-[#963F60] px-7 py-3 font-semibold text-white">Back to Services</Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <main
        className="
          flex min-h-screen
          items-center justify-center
          bg-gradient-to-b
          from-[#FFF7F8]
          to-[#F7DDE4]
          px-4 py-20
        "
      >
        <div
          className="
            w-full max-w-[520px]
            rounded-[28px]
            border border-[#EAC5D0]
            bg-white/90
            px-7 py-12
            text-center
            shadow-[0_15px_40px_rgba(112,43,68,0.1)]
          "
        >
          <div
            className="
              mx-auto mb-6
              flex h-20 w-20
              items-center justify-center
              rounded-full
              bg-[#F7DDE4]
              text-[#963F60]
            "
          >
            <ShoppingBag size={34} />
          </div>

          <h1
            className="
              font-serif text-3xl
              text-[#29252B]
            "
          >
            Your Booking Is Empty
          </h1>

          <p
            className="
              mx-auto mt-4 max-w-sm
              text-sm leading-relaxed
              text-[#766D73]
            "
          >
            Your perfect nail appointment starts
            with choosing your favorite services.
          </p>

          <Link
            to="/services"
            className="
              mt-7 inline-flex
              items-center justify-center
              gap-3 rounded-full
              bg-[#963F60]
              px-8 py-3.5
              text-sm font-semibold
              text-white
              transition-colors
              hover:bg-[#7D3250]
            "
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
    <main
      className="
        min-h-screen
        bg-gradient-to-b
        from-[#FFF7F8]
        via-[#FFF0F3]
        to-[#F7DDE4]
        text-[#29252B]
      "
    >
      {/* =====================================
          BOOKING HEADER
      ===================================== */}

      <section
        className="
          relative isolate overflow-hidden
          bg-[#5A2639]
          text-white
        "
      >
        <div
          className="
            absolute inset-0 -z-20
            bg-[url('/service-banner.png')]
            bg-cover bg-center
          "
          aria-hidden="true"
        />

        <div
          className="
            absolute inset-0 -z-10
            bg-[#3A1425]/65
          "
          aria-hidden="true"
        />

        <div
          className="
            relative mx-auto
            flex min-h-[270px]
            max-w-[1100px]
            flex-col items-center
            justify-center
            px-5 py-14
            text-center
            sm:min-h-[320px]
          "
        >
          <p
            className="
              mb-4 flex items-center
              gap-2 text-xs
              font-semibold uppercase
              tracking-[0.28em]
              text-white/85
            "
          >
            <Heart size={15} />

            InLoveNailz by Briana
          </p>

          <h1
            className="
              font-serif
              text-[clamp(2.8rem,6vw,4.8rem)]
              leading-tight
              text-white
            "
          >
            Book Your Appointment
          </h1>


        </div>
      </section>

      {/* =====================================
          BOOKING CONTENT
      ===================================== */}

      <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-[1180px]">

          {/* BACK TO SERVICES */}

          <Link
            to="/services"
            className="
              mb-8 inline-flex
              items-center gap-2
              text-sm font-semibold
              text-[#963F60]
              transition-colors
              hover:text-[#7D3250]
            "
          >
            <ArrowLeft size={17} />

            Back to Services
          </Link>

          {/* PAGE GRID */}

          <div
            className="
              grid items-start
              gap-7
              lg:grid-cols-[0.9fr_1.1fr]
              lg:gap-8
            "
          >
            {/* =====================================
                LEFT COLUMN
            ===================================== */}

            <div className="space-y-7">

              {/* =====================================
                  SERVICE SUMMARY
              ===================================== */}

              <div
                className="
                  overflow-hidden
                  rounded-[24px]
                  border border-[#EAC5D0]
                  bg-white/95
                  shadow-[0_10px_30px_rgba(112,43,68,0.08)]
                "
              >
                <div
                  className="
                    flex items-center
                    justify-between
                    border-b border-[#F0DCE3]
                    px-6 py-5
                  "
                >
                  <div className="flex items-center gap-3">
                    <ShoppingBag
                      size={22}
                      className="text-[#963F60]"
                    />

                    <h2
                      className="
                        font-serif
                        text-2xl
                        text-[#29252B]
                      "
                    >
                      Your Services
                    </h2>
                  </div>

                  <span
                    className="
                      rounded-full
                      bg-[#F7DDE4]
                      px-3 py-1
                      text-xs font-semibold
                      text-[#963F60]
                    "
                  >
                    {serviceCount}{' '}
                    {serviceCount === 1
                      ? 'Service'
                      : 'Services'}
                  </span>
                </div>

                {/* SELECTED SERVICES */}

                <div className="space-y-5 px-6 py-6">
                  {items.map(({ service, quantity }) => (
                    <div
                      key={service.id}
                      className="
                        flex items-start
                        justify-between gap-4
                      "
                    >
                      <div className="flex min-w-0 gap-3">
                        <div
                          className="
                            flex h-11 w-11
                            shrink-0 items-center
                            justify-center
                            rounded-xl
                            bg-[#FFF0F3]
                            text-[#963F60]
                          "
                        >
                          <Sparkles size={19} />
                        </div>

                        <div>
                          <p
                            className="
                              text-sm font-semibold
                              text-[#29252B]
                            "
                          >
                            {service.title}
                          </p>

                          <p
                            className="
                              mt-1 text-xs
                              text-[#8E7A85]
                            "
                          >
                            {formatDuration(
                              service.duration
                            )}

                            {quantity > 1 &&
                              ` × ${quantity}`}
                          </p>
                        </div>
                      </div>

                      <span
                        className="
                          shrink-0
                          text-sm font-bold
                          text-[#963F60]
                        "
                      >
                        $
                        {(
                          service.price * quantity
                        ).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* PRICE SUMMARY */}

                <div
                  className="
                    space-y-3
                    border-t border-[#F0DCE3]
                    bg-[#FFF7F8]
                    px-6 py-6
                  "
                >
                  <div
                    className="
                      flex justify-between
                      text-sm text-[#623848]
                    "
                  >
                    <span>Service Total</span>

                    <span className="font-semibold">
                      ${total.toFixed(2)}
                    </span>
                  </div>

                  <div
                    className="
                      flex justify-between
                      text-sm text-[#623848]
                    "
                  >
                    <span>Estimated Duration</span>

                    <span className="font-semibold">
                      {formatDuration(totalDuration)}
                    </span>
                  </div>

                  <div
                    className="
                      flex items-center
                      justify-between
                      border-t border-[#EAC5D0]
                      pt-4
                    "
                  >
                    <span
                      className="
                        text-sm font-bold
                        text-[#963F60]
                      "
                    >
                      Deposit Payment Link
                    </span>

                    <span
                      className="
                        text-2xl font-bold
                        text-[#963F60]
                      "
                    >
                      ${deposit.toFixed(2)}
                    </span>
                  </div>

                  <div
                    className="
                      flex justify-between
                      text-sm text-[#623848]
                    "
                  >
                    <span>Remaining Balance</span>

                    <span className="font-semibold">
                      ${balance.toFixed(2)}
                    </span>
                  </div>


                </div>
              </div>

              {/* =====================================
                  DATE & TIME
              ===================================== */}

              <div
                className="
                  rounded-[24px]
                  border border-[#EAC5D0]
                  bg-white/95
                  p-6
                  shadow-[0_10px_30px_rgba(112,43,68,0.08)]
                "
              >
                <div
                  className="
                    mb-6 flex
                    items-center gap-3
                  "
                >
                  <CalendarCheck2
                    size={23}
                    className="text-[#963F60]"
                  />

                  <h2
                    className="
                      font-serif
                      text-2xl
                      text-[#29252B]
                    "
                  >
                    Choose Date & Time
                  </h2>
                </div>

                {/* DATE */}

                <div>
                  <Label
                    htmlFor="appointment-date"
                    className="
                      text-sm font-semibold
                      text-[#623848]
                    "
                  >
                    Preferred Appointment Date
                  </Label>

                  <Input
                    id="appointment-date"
                    type="date"
                    value={date}
                    min={minDate}
                    onChange={event => {
                      setDate(event.target.value);
                      setTime('');
                    }}
                    className="
                      mt-2 h-12
                      rounded-xl
                      border-[#EAC5D0]
                      bg-[#FFF9FA]
                      focus-visible:ring-[#963F60]
                    "
                  />
                </div>

                {/* AVAILABLE TIMES */}

                <div className="mt-7">
                  <div
                    className="
                      mb-3 flex
                      items-center gap-2
                    "
                  >
                    <Clock3
                      size={18}
                      className="text-[#963F60]"
                    />

                    <Label
                      className="
                        text-sm font-semibold
                        text-[#623848]
                      "
                    >
                      Available Appointment Times
                    </Label>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {availableTimes.length > 0 ? (
                      availableTimes.map(slot => {
                        const isSelected = time === slot;

                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() =>
                              setTime(slot)
                            }
                            aria-pressed={isSelected}
                            className={`
                              min-h-[45px]
                              rounded-xl border
                              px-3 py-2
                              text-sm font-semibold
                              transition-all duration-200
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
                      <p
                        className="
                          col-span-full
                          rounded-xl
                          bg-[#FFF7F8]
                          px-4 py-6
                          text-center
                          text-sm
                          leading-relaxed
                          text-[#8E7A85]
                        "
                      >
                        {date
                          ? 'No appointment times are available for this date. Please choose another day.'
                          : 'Select your preferred date to see available appointment times.'}
                      </p>
                    )}
                  </div>
                </div>

                {/* SELECTED APPOINTMENT */}

                {date && time && (
                  <div
                    className="
                      mt-6 rounded-xl
                      border border-[#EAC5D0]
                      bg-[#F7DDE4]/60
                      p-4
                    "
                  >
                    <div className="flex items-start gap-3">
                      <CheckCircle2
                        size={20}
                        className="
                          mt-0.5 shrink-0
                          text-[#963F60]
                        "
                      />

                      <div>
                        <p
                          className="
                            text-sm font-semibold
                            text-[#963F60]
                          "
                        >
                          Selected Appointment
                        </p>

                        <p
                          className="
                            mt-1 text-sm
                            text-[#623848]
                          "
                        >
                          {formattedSelectedDate}
                        </p>

                        <p
                          className="
                            mt-1 text-sm
                            font-semibold
                            text-[#623848]
                          "
                        >
                          {formatTime(time)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* =====================================
                RIGHT COLUMN
                CUSTOMER DETAILS
            ===================================== */}

            <div
              className="
                rounded-[24px]
                border border-[#EAC5D0]
                bg-white/95
                p-6
                shadow-[0_10px_30px_rgba(112,43,68,0.08)]
                sm:p-8
              "
            >
              {/* HEADER */}

              <div
                className="
                  mb-7 flex
                  items-center gap-3
                  border-b border-[#F0DCE3]
                  pb-6
                "
              >
                <UserRound
                  size={23}
                  className="text-[#963F60]"
                />

                <div>
                  <h2
                    className="
                      font-serif text-2xl
                      text-[#29252B]
                    "
                  >
                    Your Information
                  </h2>

                  <p
                    className="
                      mt-1 text-xs
                      text-[#8E7A85]
                    "
                  >
                    Tell us a little about yourself.
                  </p>
                </div>
              </div>

              {/* CUSTOMER FORM */}

              <form
                onSubmit={handleSubmit}
                className="space-y-6"
              >
                {/* FULL NAME */}

                <div>
                  <Label
                    htmlFor="name"
                    className="
                      text-sm font-semibold
                      text-[#623848]
                    "
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
                    className="
                      mt-2 h-12
                      rounded-xl
                      border-[#EAC5D0]
                      bg-[#FFF9FA]
                      focus-visible:ring-[#963F60]
                    "
                  />
                </div>

                {/* EMAIL */}

                <div>
                  <Label
                    htmlFor="email"
                    className="
                      text-sm font-semibold
                      text-[#623848]
                    "
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
                    className="
                      mt-2 h-12
                      rounded-xl
                      border-[#EAC5D0]
                      bg-[#FFF9FA]
                      focus-visible:ring-[#963F60]
                    "
                  />
                </div>

                {/* PHONE */}

                <div>
                  <Label
                    htmlFor="phone"
                    className="
                      text-sm font-semibold
                      text-[#623848]
                    "
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
                    className="
                      mt-2 h-12
                      rounded-xl
                      border-[#EAC5D0]
                      bg-[#FFF9FA]
                      focus-visible:ring-[#963F60]
                    "
                  />
                </div>

                {/* NOTES */}

                <div>
                  <Label
                    htmlFor="notes"
                    className="
                      text-sm font-semibold
                      text-[#623848]
                    "
                  >
                    Appointment Notes
                    <span
                      className="
                        ml-2 text-xs
                        font-normal
                        text-[#9B8791]
                      "
                    >
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
                      mt-2 resize-none
                      rounded-xl
                      border-[#EAC5D0]
                      bg-[#FFF9FA]
                      focus-visible:ring-[#963F60]
                    "
                  />
                </div>

                {/* =====================================
                    INSPIRATION PHOTO
                ===================================== */}

                <div
                  className="
                    border-t border-[#F0DCE3]
                    pt-6
                  "
                >
                  <div
                    className="
                      mb-3 flex
                      items-center gap-2
                    "
                  >
                    <ImagePlus
                      size={20}
                      className="text-[#963F60]"
                    />

                    <Label
                      htmlFor="inspiration-image"
                      className="
                        text-sm font-semibold
                        text-[#623848]
                      "
                    >
                      Nail Inspiration Photo
                    </Label>
                  </div>

                  <p
                    className="
                      mb-4 text-xs
                      leading-relaxed
                      text-[#8E7A85]
                    "
                  >
                    Have a nail design in mind?
                    Upload a photo so Briana can
                    see your inspiration.
                  </p>

                  {/* UPLOAD AREA */}

                  {!inspirationUrl && (
                    <div
                      className="
                        rounded-2xl
                        border-2 border-dashed
                        border-[#E5B6C5]
                        bg-[#FFF7F8]
                        p-6 text-center
                      "
                    >
                      <div
                        className="
                          mx-auto mb-3
                          flex h-12 w-12
                          items-center justify-center
                          rounded-full
                          bg-[#F7DDE4]
                          text-[#963F60]
                        "
                      >
                        {isUploading ? (
                          <Loader2
                            size={23}
                            className="animate-spin"
                          />
                        ) : (
                          <UploadCloud size={23} />
                        )}
                      </div>

                      <p
                        className="
                          text-sm font-semibold
                          text-[#623848]
                        "
                      >
                        {isUploading
                          ? 'Uploading your photo...'
                          : 'Upload Your Inspiration'}
                      </p>

                      <p
                        className="
                          mt-2 text-xs
                          text-[#8E7A85]
                        "
                      >
                        JPG, PNG, or WebP • Max 3 MB
                      </p>

                      <Input
                        id="inspiration-image"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={isUploading || isSubmitting}
                        onChange={event => {
                          void handleInspirationUpload(
                            event.target.files?.[0]
                          );

                          event.target.value = '';
                        }}
                        className="
                          mt-4 h-auto
                          cursor-pointer
                          rounded-xl
                          border-[#EAC5D0]
                          bg-white
                          text-xs
                          file:mr-3
                          file:rounded-lg
                          file:border-0
                          file:bg-[#F7DDE4]
                          file:px-3
                          file:py-2
                          file:text-[#963F60]
                        "
                      />
                    </div>
                  )}

                  {/* IMAGE PREVIEW */}

                  {inspirationUrl && (
                    <div
                      className="
                        rounded-2xl
                        border border-[#EAC5D0]
                        bg-[#FFF7F8]
                        p-4
                      "
                    >
                      <div className="relative">
                        <img
                          src={inspirationUrl}
                          alt="Your nail inspiration"
                          className="
                            max-h-[260px]
                            w-full rounded-xl
                            object-contain
                          "
                        />

                        <button
                          type="button"
                          onClick={removeInspiration}
                          disabled={isSubmitting}
                          aria-label="Remove inspiration photo"
                          className="
                            absolute right-2 top-2
                            flex h-9 w-9
                            items-center justify-center
                            rounded-full
                            bg-white
                            text-[#963F60]
                            shadow-md
                            hover:bg-[#F7DDE4]
                          "
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <div
                        className="
                          mt-3 flex
                          items-center gap-2
                          text-xs text-[#623848]
                        "
                      >
                        <CheckCircle2
                          size={16}
                          className="text-[#963F60]"
                        />

                        <span className="truncate">
                          {inspirationName}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* =====================================
                    PAYMENT BUTTON
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
                    h-14 w-full
                    rounded-full
                    bg-[#963F60]
                    text-sm font-semibold
                    text-white
                    shadow-lg
                    shadow-[#963F60]/20
                    transition-all
                    hover:bg-[#7D3250]
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                >
                  {isSubmitting ? (
                    <>
                      <Loader2
                        size={19}
                        className="
                          mr-2 animate-spin
                        "
                      />

                      Sending Deposit Email...
                    </>
                  ) : (
                    <>
                      <ArrowRight size={19} className="mr-2" />

                      Request Appointment

                      <ArrowRight
                        size={17}
                        className="ml-2"
                      />
                    </>
                  )}
                </Button>

                {/* SECURE CHECKOUT NOTE */}

                <div
                  className="
                    flex items-center
                    justify-center gap-2
                    text-center text-xs
                    text-[#8E7A85]
                  "
                >
                  <ShieldCheck size={14} />

                  Your $20 deposit payment link will be emailed to you
                </div>
              </form>
            </div>
          </div>

          {/* =====================================
              BOTTOM NOTE
          ===================================== */}

          <div
            className="
              mt-10 flex flex-wrap
              items-center justify-center
              gap-x-6 gap-y-3
              text-xs text-[#8E7A85]
            "
          >
            <span className="flex items-center gap-2">
              <CalendarDays
                size={16}
                className="text-[#963F60]"
              />

              Easy Appointment Booking
            </span>

            <span className="flex items-center gap-2">
              <ShieldCheck
                size={16}
                className="text-[#963F60]"
              />

              Secure Deposit Payment
            </span>

            <span className="flex items-center gap-2">
              <Heart
                size={16}
                className="text-[#963F60]"
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
