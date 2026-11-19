
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { getServices } from '@/services/servicesData';
import ServiceCard from '@/components/ServiceCard';

import {
  ArrowRight,
  CalendarDays,
  Gem,
  Heart,
  Loader2,
  ShoppingBag,
} from 'lucide-react';

/* =========================================
   INLOVENAILZ BY BRIANA
   SERVICES PAGE
========================================= */

const CATEGORY_ORDER = [
  'Acrylic Full Sets',
  'Acrylic Fills',
  'Nail Add-Ons',
  'Pedicures & Toes',
  'Kids Services',
  "Men's Services",
];

const Services: React.FC = () => {
  const [selectedCategory, setSelectedCategory] =
    useState('All');

  /* =====================================
     LOAD SERVICES
  ===================================== */

  const {
    data: services = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['services'],
    queryFn: getServices,
  });

  /* =====================================
     CATEGORY FILTERS
  ===================================== */

  const categories = useMemo(() => {
    const availableCategories = Array.from(
      new Set(
        services.map(service => service.category)
      )
    );

    const sortedCategories = availableCategories.sort(
      (a, b) => {
        const aIndex = CATEGORY_ORDER.indexOf(a);
        const bIndex = CATEGORY_ORDER.indexOf(b);

        if (aIndex === -1 && bIndex === -1) {
          return a.localeCompare(b);
        }

        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;

        return aIndex - bIndex;
      }
    );

    return ['All', ...sortedCategories];
  }, [services]);

  const filteredServices = useMemo(() => {
    if (selectedCategory === 'All') {
      return services;
    }

    return services.filter(
      service =>
        service.category === selectedCategory
    );
  }, [services, selectedCategory]);

  return (
    <main className="min-h-screen bg-[#FFF7F8] text-[#29252B]">

      {/* =====================================
          HERO BANNER
      ===================================== */}

      <section
        className="
          relative isolate overflow-hidden
          bg-[#5A2639] text-white
        "
      >
        {/* BACKGROUND IMAGE */}

        <div
          className="
            absolute inset-0 -z-20
            bg-[url('/service-banner.png')]
            bg-cover bg-center bg-no-repeat
          "
          aria-hidden="true"
        />

        {/* DARK OVERLAY */}

        <div
          className="
            absolute inset-0 -z-10
            bg-gradient-to-r
            from-[#3A1425]/70
            via-[#5A2639]/40
            to-[#3A1425]/60
          "
          aria-hidden="true"
        />

        {/* HERO CONTENT */}

        <div
          className="
            relative mx-auto
            flex min-h-[310px]
            max-w-[1180px]
            flex-col items-center
            justify-center
            px-5 py-14
            text-center
            sm:min-h-[360px]
            lg:min-h-[390px]
          "
        >
          {/* EYEBROW */}

          <div className="flex items-center gap-4">
            <span
              className="h-px w-9 bg-white/60 sm:w-16"
              aria-hidden="true"
            />

            <p
              className="
                text-[10px] font-semibold
                uppercase tracking-[0.35em]
                text-white/90
                sm:text-xs
              "
            >
              InLoveNailz by Briana
            </p>

            <span
              className="h-px w-9 bg-white/60 sm:w-16"
              aria-hidden="true"
            />
          </div>

          {/* HEADING */}

          <h1
            className="
              mt-5 font-serif
              text-[clamp(3.2rem,7vw,5.5rem)]
              font-normal leading-[1.05]
              tracking-tight text-white
            "
          >
            Nail Services
          </h1>

          {/* DESCRIPTION */}

          <p
            className="
              mt-5 max-w-[530px]
              text-sm leading-relaxed
              text-white/90
              sm:text-base
            "
          >
            Choose from our selection of premium nail services, customized to fit your style.
          </p>

          {/* HERO FEATURES */}

          <div
            className="
              mt-8 flex flex-wrap
              items-center justify-center
              gap-x-6 gap-y-4
              sm:gap-x-8
            "
          >
            <div className="flex items-center gap-2">
              <Gem
                size={20}
                strokeWidth={1.5}
                aria-hidden="true"
              />

              <span className="text-xs sm:text-sm">
                Custom Designs
              </span>
            </div>

            <span
              className="
                hidden h-5 w-px
                bg-white/40 sm:block
              "
              aria-hidden="true"
            />

            <div className="flex items-center gap-2">
              <Heart
                size={20}
                strokeWidth={1.5}
                aria-hidden="true"
              />

              <span className="text-xs sm:text-sm">
                Quality Care
              </span>
            </div>

            <span
              className="
                hidden h-5 w-px
                bg-white/40 sm:block
              "
              aria-hidden="true"
            />

            <div className="flex items-center gap-2">
              <CalendarDays
                size={20}
                strokeWidth={1.5}
                aria-hidden="true"
              />

              <span className="text-xs sm:text-sm">
                Easy Booking
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================
          SERVICES SECTION
      ===================================== */}

      <section
        className="
          bg-gradient-to-b
          from-[#FFF7F8]
          via-[#FFF0F3]
          to-[#F7DDE4]
          px-4 pb-20 pt-12
          sm:px-6 sm:pt-16
          lg:px-8
        "
      >
        <div className="mx-auto max-w-[1180px]">

          {/* =====================================
              CATEGORY FILTERS
          ===================================== */}

          {!isLoading && !isError && (
            <div
              className="
                mb-9 flex flex-wrap
                items-center justify-center
                gap-2.5
              "
              aria-label="Filter nail services by category"
            >
              {categories.map(category => {
                const isActive =
                  selectedCategory === category;

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() =>
                      setSelectedCategory(category)
                    }
                    aria-pressed={isActive}
                    className={`
                      rounded-full border
                      px-5 py-2.5
                      text-xs font-semibold
                      transition-all duration-200
                      sm:px-6 sm:text-sm
                      ${
                        isActive
                          ? `
                            border-[#963F60]
                            bg-[#963F60]
                            text-white
                            shadow-md
                            shadow-[#963F60]/15
                          `
                          : `
                            border-[#EAC5D0]
                            bg-white/80
                            text-[#702B44]
                            hover:border-[#963F60]
                            hover:bg-[#FCEAF0]
                          `
                      }
                    `}
                  >
                    {category === 'All'
                      ? 'All Services'
                      : category}
                  </button>
                );
              })}
            </div>
          )}

          {/* =====================================
              LOADING STATE
          ===================================== */}

          {isLoading && (
            <div
              className="
                flex min-h-[320px]
                flex-col items-center
                justify-center gap-4
              "
            >
              <Loader2
                size={38}
                className="
                  animate-spin
                  text-[#963F60]
                "
              />

              <p className="text-sm text-[#766D73]">
                Loading our nail services...
              </p>
            </div>
          )}

          {/* =====================================
              ERROR STATE
          ===================================== */}

          {isError && (
            <div
              className="
                mx-auto max-w-[520px]
                rounded-2xl
                border border-[#EAC5D0]
                bg-white p-8
                text-center shadow-sm
              "
            >
              <h2
                className="
                  font-serif text-2xl
                  text-[#29252B]
                "
              >
                Unable to Load Services
              </h2>

              <p
                className="
                  mt-3 text-sm
                  text-[#766D73]
                "
              >
                Something went wrong while loading
                our services. Please try again.
              </p>

              <button
                type="button"
                onClick={() => refetch()}
                className="
                  mt-6 rounded-full
                  bg-[#963F60]
                  px-7 py-3
                  text-sm font-semibold
                  text-white
                  hover:bg-[#7D3250]
                "
              >
                Try Again
              </button>
            </div>
          )}

          {/* =====================================
              SERVICES GRID
          ===================================== */}

          {!isLoading &&
            !isError &&
            filteredServices.length > 0 && (
              <div
                className="
                  grid grid-cols-1
                  items-stretch gap-6
                  sm:grid-cols-2
                  lg:grid-cols-3
                "
              >
                {filteredServices.map(service => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                  />
                ))}
              </div>
            )}

          {/* =====================================
              EMPTY CATEGORY
          ===================================== */}

          {!isLoading &&
            !isError &&
            filteredServices.length === 0 && (
              <div className="py-20 text-center">
                <Heart
                  size={38}
                  strokeWidth={1.4}
                  className="
                    mx-auto mb-4
                    text-[#963F60]
                  "
                />

                <h2
                  className="
                    font-serif text-3xl
                    text-[#29252B]
                  "
                >
                  No Services Found
                </h2>

                <p
                  className="
                    mt-3 text-sm
                    text-[#766D73]
                  "
                >
                  There are currently no services
                  in this category.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedCategory('All')
                  }
                  className="
                    mt-6 rounded-full
                    bg-[#963F60]
                    px-7 py-3
                    text-sm font-semibold
                    text-white
                    hover:bg-[#7D3250]
                  "
                >
                  View All Services
                </button>
              </div>
            )}

          {/* =====================================
              BOOKING BANNER
          ===================================== */}

          <div
            className="
              relative mt-14
              overflow-hidden
              rounded-[28px]
              border border-white/70
              bg-[#FFF1F5]
              shadow-[0_12px_35px_rgba(112,43,68,0.12)]
            "
          >
            {/* SATIN BACKGROUND */}

            <div
              className="
                absolute inset-0
                bg-[url('/pink-satin.png')]
                bg-cover bg-center
                opacity-30
              "
              aria-hidden="true"
            />

            {/* CONTENT */}

            <div
              className="
                relative flex flex-col
                items-start gap-6
                px-6 py-8
                sm:px-9
                md:flex-row
                md:items-center
                md:justify-between
                md:px-10 md:py-10
              "
            >
              <div className="flex items-center gap-5">
                <div
                  className="
                    flex h-14 w-14
                    shrink-0
                    items-center justify-center
                    rounded-2xl
                    bg-white/70
                    text-[#963F60]
                  "
                >
                  <CalendarDays
                    size={33}
                    strokeWidth={1.5}
                  />
                </div>

                <div>
                  <p
                    className="
                      mb-2 text-xs
                      font-semibold uppercase
                      tracking-[0.2em]
                      text-[#963F60]
                    "
                  >
                    Your Nail Appointment
                  </p>

                  <h2
                    className="
                      font-serif
                      text-2xl italic
                      leading-tight
                      text-[#29252B]
                      sm:text-3xl
                    "
                  >
                    Build Your Perfect Appointment
                  </h2>

                  <p
                    className="
                      mt-2 max-w-[500px]
                      text-sm leading-relaxed
                      text-[#623848]
                    "
                  >
                    Add your favorite nail services
                    to your booking, then choose
                    your preferred appointment date
                    and time.
                  </p>
                </div>
              </div>

              <Link
                to="/book"
                className="
                  inline-flex min-h-[50px]
                  w-full shrink-0
                  items-center justify-center
                  gap-3 rounded-full
                  bg-[#963F60]
                  px-7 py-3
                  text-sm font-semibold
                  text-white
                  shadow-md
                  transition-all duration-200
                  hover:bg-[#7D3250]
                  sm:w-auto
                "
              >
                <ShoppingBag size={19} />

                View Booking

                <ArrowRight size={17} />
              </Link>
            </div>
          </div>

          {/* =====================================
              DEPOSIT NOTE
          ===================================== */}

          <p
            className="
              mt-6 text-center
              text-xs leading-relaxed
              text-[#8E7A85]
            "
          >
            A $20 booking deposit applies.
            Service prices and appointment
            durations are listed above.
            Final pricing for select custom
            designs may vary.
          </p>
        </div>
      </section>
    </main>
  );
};

export default Services;
