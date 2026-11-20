
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import type { Service } from '@/types';
import ServiceCard from '@/components/ServiceCard';

import {
  ArrowRight,
  CalendarDays,
  Heart,
  Loader2,
  ShoppingBag,
} from 'lucide-react';


async function getNeonServices(): Promise<Service[]> {
  const response = await fetch('/api/services', {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(
      `Unable to load services (${response.status}).`
    );
  }

  const result = await response.json();

  if (
    result?.success !== true ||
    !Array.isArray(result.services)
  ) {
    throw new Error('Invalid services response.');
  }

  return result.services as Service[];
}


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

  
const {
  data: services = [],
  isLoading,
  isError,
  refetch,
} = useQuery({
  queryKey: ['neonPublicServices'],
  queryFn: getNeonServices,
  staleTime: 30 * 1000,
  refetchOnWindowFocus: true,
  retry: 1,
});


  const categories = useMemo(() => {
    const availableCategories = Array.from(
      new Set(services.map(service => service.category))
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
      service => service.category === selectedCategory
    );
  }, [services, selectedCategory]);

  return (
    <main className="min-h-screen min-w-0 overflow-x-clip bg-[#FFF7F8] text-[#29252B]">

      {/* =====================================
          RESPONSIVE HERO BANNER

          Mobile / tablet:
          Full image displayed naturally.

          Desktop (1024px+):
          Shorter 300px banner.
      ===================================== */}

      <section className="relative isolate w-full overflow-hidden text-white lg:h-[300px]">

        {/* BANNER IMAGE */}

        <img
          src="/service-banner.png"
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          className="
            block h-auto w-full
            lg:h-full
            lg:object-cover
            lg:object-center
          "
        />

        {/* IMAGE OVERLAY */}

        <div
          className="
            pointer-events-none absolute inset-0
            bg-[#3A1425]/35
            sm:bg-gradient-to-r
            sm:from-[#3A1425]/70
            sm:via-[#5A2639]/40
            sm:to-[#3A1425]/60
          "
          aria-hidden="true"
        />

        {/* TEXT OVER IMAGE */}

        <div
          className="
            absolute inset-0 z-10
            flex flex-col items-center
            justify-center
            px-3 py-2 text-center
            sm:px-5
          "
        >
          {/* EYEBROW */}

          <div className="flex max-w-full items-center justify-center gap-2 sm:gap-4">
            <span
              className="h-px w-4 bg-white/60 sm:w-16"
              aria-hidden="true"
            />

            <p
              className="
                text-[clamp(7px,1.8vw,12px)]
                font-semibold uppercase
                tracking-[0.12em]
                text-white/90
                sm:tracking-[0.35em]
              "
            >
              InLoveNailz by Briana
            </p>

            <span
              className="h-px w-4 bg-white/60 sm:w-16"
              aria-hidden="true"
            />
          </div>

          {/* HEADING */}

          <h1
            className="
              mt-2 font-serif
              text-[clamp(1.4rem,7vw,5.5rem)]
              font-normal leading-[1.05]
              tracking-tight text-white
              sm:mt-5
              lg:text-[clamp(3rem,5vw,4.5rem)]
            "
          >
            Nail{' '}
            <span className="italic text-[#F7DDE4]">
              Services.
            </span>
          </h1>

          {/* DESCRIPTION */}

          <p
            className="
              mt-2 max-w-[530px]
              text-[clamp(9px,2.4vw,16px)]
              leading-[1.35]
              text-white/90
              sm:mt-5 sm:leading-relaxed
              lg:mt-3
            "
          >
            Choose from our selection of premium nail
            services, customized to fit your style.
          </p>
        </div>
      </section>

      {/* =====================================
          SERVICES SECTION
      ===================================== */}

      <section
        className="
          bg-gradient-to-b
          from-[#FFF7F8] via-[#FFF0F3] to-[#F7DDE4]
          px-2 pb-14 pt-7
          sm:px-6 sm:pb-20 sm:pt-12
          lg:px-8
        "
      >
        <div className="mx-auto max-w-[1180px]">

          {/* CATEGORY FILTERS */}

          {!isLoading && !isError && (
            <div
              className="
                mb-7 flex flex-wrap
                items-center justify-center
                gap-1.5
                sm:mb-10 sm:gap-2.5
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
                      px-3 py-2
                      text-[10px] font-semibold
                      transition-all duration-200
                      sm:px-6 sm:py-2.5 sm:text-sm
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

          {/* LOADING STATE */}

          {isLoading && (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-4">
              <Loader2
                size={38}
                className="animate-spin text-[#963F60]"
              />

              <p className="text-sm text-[#766D73]">
                Loading our nail services...
              </p>
            </div>
          )}

          {/* ERROR STATE */}

          {isError && (
            <div className="mx-auto max-w-[520px] rounded-2xl border border-[#EAC5D0] bg-white p-6 text-center shadow-sm sm:p-8">
              <h2 className="font-serif text-2xl text-[#29252B]">
                Unable to Load Services
              </h2>

              <p className="mt-3 text-sm text-[#766D73]">
                Something went wrong while loading our
                services. Please try again.
              </p>

              <button
                type="button"
                onClick={() => refetch()}
                className="mt-6 rounded-full bg-[#963F60] px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#7D3250]"
              >
                Try Again
              </button>
            </div>
          )}

          {/* RESPONSIVE SERVICE GRID */}

          {!isLoading &&
            !isError &&
            filteredServices.length > 0 && (
              <div
                className="
                  grid grid-cols-2
                  items-stretch
                  gap-2.5
                  sm:gap-5
                  lg:gap-6
                  xl:gap-7
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

          {/* EMPTY CATEGORY */}

          {!isLoading &&
            !isError &&
            filteredServices.length === 0 && (
              <div className="py-20 text-center">
                <Heart
                  size={38}
                  strokeWidth={1.4}
                  className="mx-auto mb-4 text-[#963F60]"
                />

                <h2 className="font-serif text-3xl text-[#29252B]">
                  No Services Found
                </h2>

                <p className="mt-3 text-sm text-[#766D73]">
                  There are currently no services
                  in this category.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedCategory('All')
                  }
                  className="mt-6 rounded-full bg-[#963F60] px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#7D3250]"
                >
                  View All Services
                </button>
              </div>
            )}

          {/* BOOKING BANNER */}

          <div
            className="
              relative mt-10 overflow-hidden
              rounded-[20px]
              border border-white/70
              bg-[#FFF1F5]
              shadow-[0_12px_35px_rgba(112,43,68,0.12)]
              sm:mt-14 sm:rounded-[28px]
            "
          >
            <div
              className="
                absolute inset-0
                bg-[url('/pink-satin.png')]
                bg-cover bg-center
                opacity-30
              "
              aria-hidden="true"
            />

            <div
              className="
                relative flex flex-col
                items-start gap-5
                px-4 py-6
                sm:px-9 sm:py-8
                md:flex-row md:items-center
                md:justify-between
                md:px-10 md:py-10
              "
            >
              <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-5">
                <div
                  className="
                    flex h-11 w-11 shrink-0
                    items-center justify-center
                    rounded-xl bg-white/70
                    text-[#963F60]
                    sm:h-14 sm:w-14 sm:rounded-2xl
                  "
                >
                  <CalendarDays
                    size={25}
                    strokeWidth={1.5}
                    className="sm:h-[33px] sm:w-[33px]"
                  />
                </div>

                <div className="min-w-0">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#963F60] sm:text-xs sm:tracking-[0.2em]">
                    Your Nail Appointment
                  </p>

                  <h2 className="font-serif text-xl italic leading-tight text-[#29252B] sm:text-3xl">
                    Build Your Perfect Appointment
                  </h2>

                  <p className="mt-2 max-w-[500px] text-xs leading-relaxed text-[#623848] sm:text-sm">
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
                  inline-flex min-h-[44px]
                  w-full shrink-0
                  items-center justify-center
                  gap-3 rounded-full
                  bg-[#963F60]
                  px-6 py-3
                  text-xs font-semibold text-white
                  shadow-md
                  transition-all duration-200
                  hover:-translate-y-0.5
                  hover:bg-[#7D3250]
                  hover:shadow-lg
                  sm:w-auto sm:text-sm
                "
              >
                <ShoppingBag size={17} />
                View Booking
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Services;
