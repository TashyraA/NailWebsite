
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Heart,
  Mail,
  MapPin,
  Send,
  Sparkles,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

/* =========================================
   INLOVENAILZ — CONTACT PAGE

   LUXURY WITH A POP OF PINK

   PRESERVED:
   - Existing contact form fields
   - /api/contact endpoint
   - Email notification
   - Toast notifications
   - Submission loading state
   - Form reset after success
========================================= */

const Contact = () => {
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  /* =========================================
     FORM SUBMISSION
  ========================================= */

  const submitting = React.useRef(false);
  const [website, setWebsite] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, website }),
        signal: AbortSignal.timeout(20000),
      });
      const result = await response.json();
      if (!response.ok || result?.sent !== true) {
        throw new Error(response.status === 429 ? 'Please wait before sending another message.' : 'Unable to confirm submission. Please contact us directly if needed.');
      }
      toast({ title: 'Message sent!', description: "We'll get back to you as soon as possible." });
      setFormData({ name: '', email: '', phone: '', message: '' });
      setWebsite('');
    } catch (error) {
      toast({ title: 'Message not confirmed', description: error instanceof Error && error.message === 'Please wait before sending another message.' ? error.message : 'We could not confirm your message was sent. Please contact us directly if needed.', variant: 'destructive' });
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  /* =========================================
     INPUT STYLING
  ========================================= */

  const inputClassName = `
    mt-2
    h-[48px]
    rounded-[8px]
    border border-[#E8D8DE]
    bg-[#FFFDFD]
    px-4
    text-[13px]
    text-[#29252B]
    placeholder:text-[#A79AA1]
    shadow-none
    transition-all duration-200
    hover:border-[#D6A6B8]
    focus-visible:border-[#C9809B]
    focus-visible:ring-2
    focus-visible:ring-[#F7DDE4]
    focus-visible:ring-offset-0
  `;

  const labelClassName = `
    text-[11px]
    font-semibold
    tracking-[0.03em]
    text-[#51424A]
  `;

  return (
    <main className="min-h-screen overflow-hidden bg-[#FFF7F8] text-[#29252B]">
      {/* =====================================
          PAGE HEADER
      ===================================== */}

      <section className="relative overflow-hidden bg-[#FFF9FA] px-5 pb-10 pt-12 text-center sm:pt-16">
        <div
          className="pointer-events-none absolute -right-24 -top-28 h-[350px] w-[350px] rounded-full bg-[#F7DDE4]/50 blur-[90px]"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-[720px]">
          <div className="flex items-center justify-center gap-3">
            <span className="h-px w-9 bg-[#DFA2B5]" />

            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#963F60]">
              We'd Love to Hear From You
            </p>

            <span className="h-px w-9 bg-[#DFA2B5]" />
          </div>

          <h1 className="mt-5 font-serif text-[clamp(2.8rem,5vw,4.5rem)] font-normal leading-[1.05] tracking-[-0.035em]">
            Let's Get in{' '}
            <span className="italic text-[#963F60]">
              Touch.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-[520px] text-[13px] leading-[1.9] text-[#766D73] sm:text-[14px]">
            Questions about services, nail designs,
            or your next appointment? I'd love to
            hear from you.
          </p>
        </div>
      </section>

      {/* =====================================
          MAIN CONTACT SECTION
      ===================================== */}

      <section className="relative px-5 pb-20 pt-4 sm:px-8 lg:pb-24">
        <div className="mx-auto grid max-w-[1120px] grid-cols-1 items-start gap-9 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12">
          {/* =================================
              LEFT — CONTACT INTRO
          ================================= */}

          <div className="space-y-6">
            {/* BERRY ACCENT PANEL */}

            <div className="relative isolate overflow-hidden rounded-[22px] bg-[#74334E] px-7 py-9 text-white shadow-[0_16px_45px_rgba(112,43,68,0.15)] sm:px-9 sm:py-10">
              {/* BACKGROUND GLOW */}

              <div
                className="pointer-events-none absolute -right-16 -top-16 -z-10 h-[260px] w-[260px] rounded-full bg-[#F8B4CE]/25 blur-[60px]"
                aria-hidden="true"
              />

              {/* NEON HEART — SPARKLE REMOVED */}

              <div className="relative mb-7 flex h-[85px] w-[85px] items-center justify-center">
                <Heart
                  size={65}
                  strokeWidth={1.35}
                  className="contact-neon-heart text-[#FFD5E4]"
                  aria-hidden="true"
                />
              </div>

              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#FFD1E1]">
                A Little Love Note
              </p>

              <h2 className="mt-4 font-serif text-[clamp(2rem,3vw,2.8rem)] font-normal leading-[1.15]">
                Let's Talk{' '}
                <span className="italic text-[#FFC4DA]">
                  Nails.
                </span>
              </h2>

              <p className="mt-5 max-w-[370px] text-[13px] leading-[1.9] text-[#FBE7EE]">
                Whether you have a question, a
                creative nail idea, or just need
                a little guidance before booking,
                I'm happy to help.
              </p>

              <p className="mt-6 font-serif text-[19px] italic text-[#FFD1E1]">
                With love, Briana ♡
              </p>
            </div>

            {/* CONTACT INFORMATION */}

            <div className="rounded-[18px] border border-[#E9CCD6] bg-white px-6 py-7 shadow-[0_8px_28px_rgba(112,43,68,0.05)] sm:px-7">
              <div className="mb-6 flex items-center gap-3">
                <span className="h-px w-7 bg-[#C9809B]" />

                <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#963F60]">
                  Contact Details
                </h3>
              </div>

              <div className="space-y-6">
                {/* EMAIL */}

                <div className="flex items-start gap-4">
                  <div className="flex h-[43px] w-[43px] shrink-0 items-center justify-center rounded-[12px] bg-[#F7DDE4]/70 text-[#963F60]">
                    <Mail size={19} strokeWidth={1.6} />
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#963F60]">
                      Email
                    </p>

                    <a
                      href="mailto:brianalehota@gmail.com"
                      className="mt-1 inline-block break-all text-[13px] text-[#51424A] transition-colors hover:text-[#963F60]"
                    >
                      brianalehota@gmail.com
                    </a>
                  </div>
                </div>

                {/* LOCATION */}

                <div className="flex items-start gap-4">
                  <div className="flex h-[43px] w-[43px] shrink-0 items-center justify-center rounded-[12px] bg-[#F7DDE4]/70 text-[#963F60]">
                    <MapPin size={19} strokeWidth={1.6} />
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#963F60]">
                      Based In
                    </p>

                    <p className="mt-1 text-[13px] text-[#51424A]">
                      Cleveland, Ohio
                    </p>
                  </div>
                </div>

                {/* BOOKING */}

                <div className="flex items-start gap-4">
                  <div className="flex h-[43px] w-[43px] shrink-0 items-center justify-center rounded-[12px] bg-[#F7DDE4]/70 text-[#963F60]">
                    <CalendarDays size={19} strokeWidth={1.6} />
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#963F60]">
                      Appointments
                    </p>

                    <Link
                      to="/book"
                      className="mt-1 inline-flex items-center gap-2 text-[13px] font-medium text-[#963F60] transition-colors hover:text-[#79324F]"
                    >
                      Request an Appointment
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* NOTE */}

            <div className="rounded-[14px] border border-[#EACDD7] bg-[#F7DDE4]/45 px-5 py-5">
              <div className="flex items-center gap-2">
                <Sparkles
                  size={16}
                  className="text-[#963F60]"
                />

                <p className="text-[11px] font-semibold text-[#963F60]">
                  Before You Book
                </p>
              </div>

              <p className="mt-2 text-[12px] leading-[1.8] text-[#766D73]">
                For appointment requests, please
                use the booking page so all your
                service details can be included.
              </p>
            </div>
          </div>

          {/* =================================
              RIGHT — CONTACT FORM
          ================================= */}

          <div className="relative isolate rounded-[22px] bg-white p-[10px] shadow-[0_18px_55px_rgba(112,43,68,0.1)]">
            {/* ILLUMINATED BORDER */}

            <div
              className="contact-neon-border pointer-events-none absolute inset-[6px] z-10 rounded-[18px] border-[2px] border-[#FFEAF2]"
              aria-hidden="true"
            />

            <div className="relative z-20 overflow-hidden rounded-[14px] bg-white">
              {/* BLUSH FORM HEADER */}

              <div className="relative overflow-hidden bg-[#F7DDE4] px-6 py-8 sm:px-9">
                <div
                  className="pointer-events-none absolute -right-10 -top-12 h-[180px] w-[180px] rounded-full bg-white/45 blur-[40px]"
                  aria-hidden="true"
                />

                <div className="relative">
                  <div className="flex items-center gap-3">
                    <span className="h-px w-8 bg-[#963F60]" />

                    <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[#963F60]">
                      Send a Love Note
                    </p>
                  </div>

                  <h2 className="mt-4 font-serif text-[clamp(2rem,3vw,2.8rem)] font-normal leading-tight">
                    Send Me a{' '}
                    <span className="italic text-[#963F60]">
                      Message.
                    </span>
                  </h2>

                  <p className="mt-3 max-w-[400px] text-[12px] leading-[1.8] text-[#765B67]">
                    Have something on your mind?
                    Fill out the form below and
                    I'll be in touch as soon as possible.
                  </p>
                </div>
              </div>

              {/* FORM BODY */}

              <div className="px-5 py-8 sm:px-9 sm:py-9">
                <form
                  onSubmit={handleSubmit}
                  className="space-y-6"
                >
                  <div className="hidden" aria-hidden="true">
                    <label htmlFor="contact-website">Leave this field empty</label>
                    <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} />
                  </div>
                  {/* NAME + EMAIL */}

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    {/* NAME */}

                    <div>
                      <Label
                        htmlFor="name"
                        className={labelClassName}
                      >
                        Your Name
                        <span className="ml-1 text-[#C9809B]">
                          *
                        </span>
                      </Label>

                      <Input
                        id="name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        required
                        maxLength={120}
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            name: e.target.value,
                          })
                        }
                        placeholder="Jane Smith"
                        className={inputClassName}
                      />
                    </div>

                    {/* EMAIL */}

                    <div>
                      <Label
                        htmlFor="email"
                        className={labelClassName}
                      >
                        Email Address
                        <span className="ml-1 text-[#C9809B]">
                          *
                        </span>
                      </Label>

                      <Input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        maxLength={254}
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            email: e.target.value,
                          })
                        }
                        placeholder="jane@example.com"
                        className={inputClassName}
                      />
                    </div>
                  </div>

                  {/* PHONE */}

                  <div>
                    <Label
                      htmlFor="phone"
                      className={labelClassName}
                    >
                      Phone Number

                      <span className="ml-2 text-[10px] font-normal text-[#A79AA1]">
                        Optional
                      </span>
                    </Label>

                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      maxLength={40}
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          phone: e.target.value,
                        })
                      }
                      placeholder="(555) 123-4567"
                      className={inputClassName}
                    />
                  </div>

                  {/* MESSAGE */}

                  <div>
                    <Label
                      htmlFor="message"
                      className={labelClassName}
                    >
                      Your Message
                      <span className="ml-1 text-[#C9809B]">
                        *
                      </span>
                    </Label>

                    <Textarea
                      id="message"
                      name="message"
                      required
                      maxLength={5000}
                      value={formData.message}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          message: e.target.value,
                        })
                      }
                      placeholder="Tell me how I can help you..."
                      rows={6}
                      className="mt-2 min-h-[150px] resize-y rounded-[8px] border border-[#E8D8DE] bg-[#FFFDFD] px-4 py-3 text-[13px] leading-[1.8] text-[#29252B] placeholder:text-[#A79AA1] shadow-none transition-all duration-200 hover:border-[#D6A6B8] focus-visible:border-[#C9809B] focus-visible:ring-2 focus-visible:ring-[#F7DDE4] focus-visible:ring-offset-0"
                    />

                    <p className="mt-2 text-right text-[10px] text-[#A79AA1]">
                      {formData.message.length}/5000
                    </p>
                  </div>

                  {/* SUBMIT */}

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    size="lg"
                    className="group flex h-[50px] w-full items-center justify-center gap-3 rounded-[8px] bg-[#963F60] px-6 text-[12px] font-semibold tracking-[0.04em] text-white shadow-[0_8px_20px_rgba(150,63,96,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#79324F] hover:shadow-[0_12px_28px_rgba(150,63,96,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <span
                          className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                          aria-hidden="true"
                        />

                        Sending Your Message...
                      </>
                    ) : (
                      <>
                        <Send size={16} />

                        Send Message

                        <ArrowRight
                          size={15}
                          className="transition-transform group-hover:translate-x-1"
                        />
                      </>
                    )}
                  </Button>

                  {/* REASSURANCE */}

                  <div className="flex items-center justify-center gap-2 pt-1">
                    <CheckCircle2
                      size={14}
                      className="shrink-0 text-[#C9809B]"
                    />

                    <p className="text-center text-[10px] leading-relaxed text-[#94858D]">
                      Your message will be sent
                      directly to InLoveNailz.
                    </p>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================
          BOOKING CALLOUT
      ===================================== */}

      <section className="border-t border-[#E9CCD6] bg-[#F7DDE4]/65 px-5 py-12 text-center">
        <div className="mx-auto max-w-[650px]">
          <div className="mb-3 flex items-center justify-center gap-2">
            <Heart
              size={15}
              className="text-[#963F60]"
            />

            <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-[#963F60]">
              Your Next Set Awaits
            </p>
          </div>

          <h2 className="font-serif text-[clamp(2rem,3vw,2.8rem)] font-normal">
            Ready for Something{' '}
            <span className="italic text-[#963F60]">
              Beautiful?
            </span>
          </h2>

          <p className="mx-auto mt-3 max-w-[430px] text-[12px] leading-[1.8] text-[#766D73]">
            Ready to turn your nail inspiration
            into your next appointment?
          </p>

          <Link
            to="/book"
            className="mt-6 inline-flex min-h-[44px] items-center justify-center gap-3 rounded-[8px] bg-[#963F60] px-7 py-3 text-[11px] font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#79324F] hover:shadow-[0_10px_25px_rgba(150,63,96,0.25)]"
          >
            Book an Appointment

            <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {/* =====================================
          NEON ANIMATIONS
      ===================================== */}

      <style>
        {`
          @keyframes contactNeonIlluminate {
            0%, 100% {
              border-color: #FFEAF2;
              box-shadow:
                0 0 5px rgba(255,255,255,0.95),
                0 0 12px rgba(255,153,190,0.4),
                0 0 22px rgba(255,153,190,0.16),
                inset 0 0 10px rgba(255,153,190,0.08);
            }

            50% {
              border-color: #FFFFFF;
              box-shadow:
                0 0 8px rgba(255,255,255,1),
                0 0 18px rgba(255,133,181,0.7),
                0 0 36px rgba(255,105,165,0.3),
                inset 0 0 18px rgba(255,153,190,0.16);
            }
          }

          @keyframes contactHeartGlow {
            0%, 100% {
              filter:
                drop-shadow(0 0 4px rgba(255,210,228,0.65))
                drop-shadow(0 0 10px rgba(255,137,185,0.35));
            }

            50% {
              filter:
                drop-shadow(0 0 7px rgba(255,230,239,1))
                drop-shadow(0 0 18px rgba(255,137,185,0.8))
                drop-shadow(0 0 28px rgba(255,105,165,0.4));
            }
          }

          .contact-neon-border {
            animation:
              contactNeonIlluminate 4.5s ease-in-out infinite;
          }

          .contact-neon-heart {
            animation:
              contactHeartGlow 4s ease-in-out infinite;
          }

          @media (prefers-reduced-motion: reduce) {
            .contact-neon-border,
            .contact-neon-heart {
              animation: none;
            }

            .contact-neon-border {
              border-color: #FFEAF2;
              box-shadow:
                0 0 6px rgba(255,255,255,0.95),
                0 0 16px rgba(255,133,181,0.5);
            }

            .contact-neon-heart {
              filter:
                drop-shadow(0 0 7px rgba(255,210,228,0.7));
            }
          }
        `}
      </style>
    </main>
  );
};

export default Contact;
