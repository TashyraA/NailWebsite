
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Heart,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';

/* =========================================
   SHARED HEADER
========================================= */

const CartHeader = () => {
  return (
    <section
      className="relative isolate overflow-hidden border-b border-[#E9C8D4] bg-[#F7DDE4] px-5 py-20 text-center sm:px-8 sm:py-24 lg:py-28"
      style={{
        backgroundImage: "url('/cart-banner.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* SOFT OVERLAY FOR READABILITY */}

      <div
        className="pointer-events-none absolute inset-0 bg-[#FFE7EF]/25"
        aria-hidden="true"
      />

      {/* CENTERED HEADER CONTENT */}

      <div className="relative z-10 mx-auto max-w-[750px]">
        <div className="flex items-center justify-center gap-3">
          <span
            className="h-px w-9 bg-[#963F60]"
            aria-hidden="true"
          />

          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#74334E]">
            InLoveNailz
          </p>

          <span
            className="h-px w-9 bg-[#963F60]"
            aria-hidden="true"
          />
        </div>

        <h1 className="mt-5 font-serif text-[clamp(3rem,6vw,5rem)] font-normal leading-[1.08] tracking-[-0.035em] text-[#29252B] drop-shadow-[0_2px_12px_rgba(255,247,248,0.8)]">
          Your{' '}
          <span className="italic text-[#963F60]">
            Nail Bag.
          </span>
        </h1>

        <p className="mx-auto mt-5 max-w-[520px] text-[13px] leading-[1.9] text-[#74334E] sm:text-[14px]">
          Your next beautiful set starts here.
          Review your selections and get ready
          for a little nail magic.
        </p>
      </div>
    </section>
  );
};

/* =========================================
   SATIN BERRY FOOTER TRANSITION
========================================= */

const CartSatinSignature = () => {
  return (
    <section className="relative isolate overflow-hidden bg-[#963F60] px-5 py-14 text-center text-white sm:py-16">
      {/* SATIN BASE */}

      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `
            linear-gradient(
              125deg,
              #713047 0%,
              #963F60 18%,
              #B65E7D 32%,
              #8A3655 48%,
              #C07190 62%,
              #963F60 78%,
              #713047 100%
            )
          `,
        }}
        aria-hidden="true"
      />

      {/* SOFT SATIN FOLDS */}

      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{
          background: `
            linear-gradient(
              112deg,
              transparent 8%,
              rgba(255, 226, 236, 0.04) 18%,
              rgba(255, 226, 236, 0.25) 27%,
              rgba(255, 226, 236, 0.03) 35%,
              transparent 45%,
              rgba(255, 214, 230, 0.12) 57%,
              rgba(255, 241, 247, 0.26) 64%,
              rgba(255, 214, 230, 0.04) 73%,
              transparent 85%
            )
          `,
        }}
        aria-hidden="true"
      />

      {/* GENTLE SATIN SHIMMER */}

      <div
        className="cart-satin-shimmer pointer-events-none absolute -inset-x-[45%] inset-y-0 -z-10 opacity-30"
        style={{
          background: `
            linear-gradient(
              110deg,
              transparent 35%,
              rgba(255, 236, 244, 0.04) 44%,
              rgba(255, 240, 247, 0.22) 50%,
              rgba(255, 236, 244, 0.04) 56%,
              transparent 65%
            )
          `,
        }}
        aria-hidden="true"
      />

      {/* SATIN DEPTH */}

      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `
            radial-gradient(
              ellipse at 20% 15%,
              rgba(255, 216, 232, 0.18),
              transparent 45%
            ),
            radial-gradient(
              ellipse at 85% 85%,
              rgba(76, 15, 40, 0.22),
              transparent 50%
            )
          `,
        }}
        aria-hidden="true"
      />

      {/* SIGNATURE CONTENT */}

      <div className="relative z-10 mx-auto max-w-[650px]">
        <Heart
          size={22}
          strokeWidth={1.4}
          className="mx-auto text-[#FFE1EC]"
          aria-hidden="true"
        />

        <h2 className="mt-5 font-serif text-[clamp(1.9rem,4vw,2.8rem)] font-normal leading-tight drop-shadow-[0_2px_10px_rgba(64,18,37,0.18)]">
          A Little Love in{' '}
          <span className="italic text-[#FFE0EB]">
            Every Set.
          </span>
        </h2>

        <p className="mx-auto mt-4 max-w-[430px] text-[12px] leading-[1.9] text-[#FFF0F5] sm:text-[13px]">
          Beautiful nails, thoughtfully created
          just for you.
        </p>
      </div>
    </section>
  );
};

/* =========================================
   MAIN CART PAGE
========================================= */

const Cart = () => {
  const navigate = useNavigate();

  const {
    items,
    removeFromCart,
    updateQuantity,
    getTotalPrice,
    getTotalDeposit,
  } = useCart();

  const totalPrice = getTotalPrice();
  const totalDeposit = getTotalDeposit();
  const remainingBalance = totalPrice - totalDeposit;

  const formatPrice = (amount: number) =>
    `$${amount.toFixed(2)}`;

  /* =========================================
     EMPTY CART
  ========================================= */

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-[#FFF7F8] text-[#29252B]">
        <CartHeader />

        <section className="px-5 py-16 sm:py-20">
          <div className="mx-auto max-w-[500px] rounded-[20px] border border-[#EEDDE3] bg-white px-7 py-12 text-center shadow-[0_10px_35px_rgba(112,43,68,0.05)] sm:px-10">
            <div className="mx-auto flex h-[82px] w-[82px] items-center justify-center rounded-full bg-[#F7DDE4]/70">
              <ShoppingBag
                size={34}
                strokeWidth={1.4}
                className="text-[#963F60]"
                aria-hidden="true"
              />
            </div>

            <h2 className="mt-6 font-serif text-[30px] font-normal">
              Your Bag Is{' '}
              <span className="italic text-[#963F60]">
                Empty.
              </span>
            </h2>

            <p className="mx-auto mt-4 max-w-[320px] text-[13px] leading-[1.8] text-[#766D73]">
              Explore our nail services and
              add your favorites to create
              your perfect appointment.
            </p>

            <Button
              onClick={() => navigate('/services')}
              className="group mt-8 h-[47px] rounded-[8px] bg-[#963F60] px-8 text-[12px] font-semibold text-white shadow-[0_7px_20px_rgba(150,63,96,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#79324F] hover:shadow-[0_12px_26px_rgba(150,63,96,0.28)]"
            >
              Browse Services

              <ArrowRight
                size={16}
                className="ml-3 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Button>
          </div>
        </section>

        <CartSatinSignature />

        <style>
          {`
            @keyframes cartSatinShimmer {
              0%, 100% {
                transform: translateX(-12%);
              }

              50% {
                transform: translateX(12%);
              }
            }

            .cart-satin-shimmer {
              animation: cartSatinShimmer 14s ease-in-out infinite;
            }

            @media (prefers-reduced-motion: reduce) {
              .cart-satin-shimmer {
                animation: none;
              }
            }
          `}
        </style>
      </main>
    );
  }

  /* =========================================
     CART WITH ITEMS
  ========================================= */

  return (
    <main className="min-h-screen bg-[#FFF7F8] text-[#29252B]">
      <CartHeader />

      {/* CART CONTENT */}

      <section className="px-5 pb-20 pt-12 sm:px-8 lg:pb-24">
        <div className="mx-auto max-w-[1120px]">
          <div className="grid grid-cols-1 items-start gap-9 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
            {/* SELECTED SERVICES */}

            <div>
              <div className="mb-6">
                <h2 className="font-serif text-[27px] font-normal">
                  Selected Services
                </h2>

                <p className="mt-1 text-[12px] text-[#94858D]">
                  Make any final adjustments below.
                </p>
              </div>

              <div className="space-y-4">
                {items.map((item) => (
                  <article
                    key={item.service.id}
                    className="rounded-[16px] border border-[#E9D3DC] bg-white p-4 shadow-[0_6px_24px_rgba(112,43,68,0.045)] transition-all duration-300 hover:border-[#DFAFC0] hover:shadow-[0_10px_30px_rgba(112,43,68,0.08)] sm:p-5"
                  >
                    <div className="flex flex-col gap-5 sm:flex-row">
                      {/* SERVICE IMAGE */}

                      <div className="w-full shrink-0 overflow-hidden rounded-[11px] border border-[#F0E3E8] bg-[#FFF9FA] sm:h-[140px] sm:w-[130px]">
                        {item.service.images?.[0] ? (
                          <img
                            src={item.service.images[0]}
                            alt={item.service.title}
                            loading="lazy"
                            className="block aspect-[4/3] w-full object-contain sm:aspect-auto sm:h-full"
                          />
                        ) : (
                          <div className="flex aspect-[4/3] items-center justify-center sm:aspect-auto sm:h-full">
                            <ShoppingBag
                              size={26}
                              strokeWidth={1.3}
                              className="text-[#C9809B]"
                              aria-hidden="true"
                            />
                          </div>
                        )}
                      </div>

                      {/* SERVICE DETAILS */}

                      <div className="flex min-w-0 flex-1 flex-col">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#963F60]">
                          {item.service.category}
                        </p>

                        <h3 className="mt-2 font-serif text-[23px] font-medium leading-tight">
                          {item.service.title}
                        </h3>

                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-[#766D73]">
                            <Clock3
                              size={13}
                              strokeWidth={1.7}
                              className="text-[#C9809B]"
                              aria-hidden="true"
                            />

                            {item.service.duration} mins
                          </span>

                          <span className="text-[11px] text-[#766D73]">
                            Deposit:{' '}
                            {formatPrice(item.service.deposit)}
                          </span>
                        </div>

                        {/* QUANTITY + REMOVE */}

                        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
                          <div className="inline-flex h-[36px] items-center rounded-[7px] border border-[#E7CBD5] bg-[#FFF7F8]">
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(
                                  item.service.id,
                                  item.quantity - 1
                                )
                              }
                              aria-label={`Decrease quantity of ${item.service.title}`}
                              className="flex h-full w-[35px] items-center justify-center rounded-l-[7px] text-[#963F60] transition-colors hover:bg-[#F7DDE4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#963F60]"
                            >
                              <Minus size={13} aria-hidden="true" />
                            </button>

                            <span className="min-w-[30px] text-center text-[12px] font-medium">
                              {item.quantity}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(
                                  item.service.id,
                                  item.quantity + 1
                                )
                              }
                              aria-label={`Increase quantity of ${item.service.title}`}
                              className="flex h-full w-[35px] items-center justify-center rounded-r-[7px] text-[#963F60] transition-colors hover:bg-[#F7DDE4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#963F60]"
                            >
                              <Plus size={13} aria-hidden="true" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              removeFromCart(item.service.id)
                            }
                            className="inline-flex items-center gap-1.5 text-[11px] text-[#A15B72] transition-colors hover:text-[#79324F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#963F60]"
                          >
                            <Trash2 size={13} aria-hidden="true" />

                            Remove
                          </button>
                        </div>
                      </div>

                      {/* SERVICE PRICE */}

                      <div className="flex shrink-0 items-center justify-between border-t border-[#F0E3E8] pt-4 sm:ml-1 sm:flex-col sm:items-end sm:justify-start sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                        <span className="text-[10px] text-[#94858D]">
                          Total
                        </span>

                        <p className="font-serif text-[25px] font-medium text-[#963F60]">
                          {formatPrice(
                            item.service.price * item.quantity
                          )}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {/* ADD MORE SERVICES */}

              <button
                type="button"
                onClick={() => navigate('/services')}
                className="group mt-6 inline-flex items-center gap-2 text-[12px] font-medium text-[#963F60] transition-colors hover:text-[#79324F]"
              >
                <Plus size={15} aria-hidden="true" />

                Add More Services

                <ArrowRight
                  size={14}
                  className="transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </button>
            </div>

            {/* MOBILE DIVIDER */}

            <div
              className="h-px w-full bg-[#DFAFC0] lg:hidden"
              aria-hidden="true"
            />

            {/* APPOINTMENT SUMMARY */}

            <aside className="overflow-hidden rounded-[17px] border border-[#E3C0CD] bg-white shadow-[0_10px_35px_rgba(112,43,68,0.07)] lg:sticky lg:top-24">
              <div className="border-b border-[#E2BAC9] bg-[#EAC3D1] px-6 py-6">
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#963F60]">
                  Almost There
                </p>

                <h2 className="mt-2 font-serif text-[28px] font-normal leading-tight">
                  Appointment{' '}
                  <span className="italic text-[#963F60]">
                    Summary.
                  </span>
                </h2>
              </div>

              <div className="px-6 py-6">
                {/* PRICE BREAKDOWN */}

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[12px] text-[#766D73]">
                      Subtotal
                    </span>

                    <span className="text-[12px] font-medium">
                      {formatPrice(totalPrice)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[12px] font-medium text-[#963F60]">
                      Deposit Required
                    </span>

                    <span className="text-[13px] font-semibold text-[#963F60]">
                      {formatPrice(totalDeposit)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[12px] text-[#766D73]">
                      Balance at Appointment
                    </span>

                    <span className="text-[12px] font-medium">
                      {formatPrice(remainingBalance)}
                    </span>
                  </div>
                </div>

                {/* TOTAL */}

                <div className="mt-6 border-t border-[#EEDDE3] pt-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-serif text-[21px]">
                      Total
                    </span>

                    <span className="font-serif text-[29px] font-medium text-[#963F60]">
                      {formatPrice(totalPrice)}
                    </span>
                  </div>
                </div>

                {/* DEPOSIT INFORMATION */}

                <div className="mt-5 rounded-[10px] border border-[#F0DDE4] bg-[#FFF7F8] px-4 py-4">
                  <p className="text-[11px] font-semibold text-[#963F60]">
                    Deposit Information
                  </p>

                  <p className="mt-2 text-[11px] leading-[1.8] text-[#766D73]">
                    Your {formatPrice(totalDeposit)}{' '}
                    deposit payment link will be
                    sent by email after you submit
                    your appointment request.
                  </p>

                  <p className="mt-2 text-[11px] leading-[1.8] text-[#766D73]">
                    The remaining{' '}
                    {formatPrice(remainingBalance)}{' '}
                    is due at your appointment.
                  </p>
                </div>

                {/* REQUEST APPOINTMENT */}

                <Button
                  onClick={() => navigate('/book')}
                  size="lg"
                  className="group mt-6 h-[48px] w-full rounded-[8px] bg-[#963F60] px-3 text-[12px] font-semibold text-white shadow-[0_6px_18px_rgba(150,63,96,0.16)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#79324F] hover:shadow-[0_12px_26px_rgba(150,63,96,0.3)] focus-visible:ring-2 focus-visible:ring-[#963F60] focus-visible:ring-offset-2"
                >
                  <CalendarDays
                    size={16}
                    className="mr-2"
                    aria-hidden="true"
                  />

                  Request Appointment

                  <ArrowRight
                    size={15}
                    className="ml-2 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </Button>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* SATIN BERRY FOOTER TRANSITION */}

      <CartSatinSignature />

      {/* SATIN SHIMMER ANIMATION */}

      <style>
        {`
          @keyframes cartSatinShimmer {
            0%, 100% {
              transform: translateX(-12%);
            }

            50% {
              transform: translateX(12%);
            }
          }

          .cart-satin-shimmer {
            animation: cartSatinShimmer 14s ease-in-out infinite;
          }

          @media (prefers-reduced-motion: reduce) {
            .cart-satin-shimmer {
              animation: none;
            }
          }
        `}
      </style>
    </main>
  );
};

export default Cart;
