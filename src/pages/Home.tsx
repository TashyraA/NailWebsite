
import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  Gem,
  Layers3,
  Heart,
} from 'lucide-react';

import ServiceCarousel from '@/components/ServiceCarousel';

/* =========================================
   INLOVENAILZ — HOMEPAGE
========================================= */

const carouselImages: string[] = [
  '/services/service-1.jpg',
  '/services/service-2.jpg',
  '/services/service-3.jpg',
  '/services/service-4.jpg',
  '/services/service-5.jpg',
  '/services/service-6.jpg',
  '/services/service-7.jpg',
  '/services/service-8.jpg',
  '/services/service-9.jpg',
  '/services/service-10.jpg',
  '/services/service-11.jpg',
  '/services/service-12.jpg',
];

const featuredServices = [
  {
    icon: Layers3,
    title: 'Full Sets',
    description: 'Acrylic, gel, and custom sets',
  },
  {
    icon: Heart,
    title: 'Manicures',
    description: 'Clean, polished, and long-lasting',
  },
  {
    icon: Gem,
    title: 'Nail Art Add-Ons',
    description:
      'Rhinestones, charms, hand-painted designs & more',
  },
];

const Home = () => {
  return (
    <main className="min-h-screen bg-[#FFF7F8] text-[#29252B]">

      {/* =====================================
          HERO SECTION
      ===================================== */}

      <section
        className="
          relative isolate
          overflow-hidden
          bg-[#21191F]
          text-white
        "
      >
        {/* NEW HERO IMAGE

            Uses hero-background.png.

            On desktop, the image is displayed
            at its natural aspect ratio.

            On mobile, the image covers the
            taller hero area.
        */}

        <div
          className="
            absolute inset-0 -z-20
            bg-[url('/hero-background.png')]
            bg-cover
            bg-[65%_center]
            bg-no-repeat
            lg:bg-[length:100%_100%]
            lg:bg-center
          "
          aria-hidden="true"
        />

        {/* SUBTLE GRADIENT FOR TEXT READABILITY */}

        <div
          className="
            absolute inset-0 -z-10
            bg-gradient-to-r
            from-[#21191F]/90
            via-[#21191F]/65
            to-transparent
            lg:from-[#21191F]/60
            lg:via-[#21191F]/15
            lg:to-transparent
          "
          aria-hidden="true"
        />

        {/* HERO CONTENT */}

        <div
          className="
            relative mx-auto
            flex min-h-[480px]
            max-w-[1180px]
            items-center
            px-6 py-12
            sm:min-h-[500px]
            md:px-8
            lg:min-h-0
            lg:aspect-[1920/650]
            lg:py-8
          "
        >
          <div className="w-full max-w-[510px]">

            {/* LOCATION */}

            <div className="mb-5 flex items-center gap-4">
              <p
                className="
                  text-[9px] font-semibold
                  uppercase tracking-[0.28em]
                  text-[#F7DDE4]
                  sm:text-[10px]
                "
              >
                Cleveland, Ohio · Licensed Manicurist
              </p>

              <span
                className="
                  hidden h-px w-9 shrink-0
                  bg-[#EFA1B7]/65
                  sm:block
                "
                aria-hidden="true"
              />
            </div>

            {/* MAIN HEADLINE */}

            <h1
              className="
                font-serif
                text-[clamp(2.35rem,4vw,3.9rem)]
                font-normal
                leading-[1.02]
                tracking-[-0.025em]
                text-white
              "
            >
              Custom Nails.
              <br />
              Signature{' '}
              <span className="italic text-[#EFA1B7]">
                Artistry.
              </span>
            </h1>

            {/* DESCRIPTION */}

            <p
              className="
                mt-4 max-w-[410px]
                text-[12px]
                leading-[1.8]
                text-white/90
                sm:text-[13px]
              "
            >
              Elevated nail sets, detailed designs,
              and a personalized experience that
              brings your vision to life.
            </p>

            {/* HERO BUTTONS */}

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/book"
                className="
                  inline-flex min-h-[42px]
                  items-center justify-center
                  gap-3 rounded-[6px]
                  bg-[#963F60]
                  px-6 py-2.5
                  text-[11px] font-semibold
                  text-white
                  transition-colors duration-200
                  hover:bg-[#79324F]
                "
              >
                Book an Appointment

                <ArrowRight
                  size={14}
                  aria-hidden="true"
                />
              </Link>

              <Link
                to="/services"
                className="
                  inline-flex min-h-[42px]
                  items-center justify-center
                  rounded-[6px]
                  border border-white/60
                  px-6 py-2.5
                  text-[11px] font-semibold
                  text-white
                  transition-colors duration-200
                  hover:bg-white/10
                "
              >
                View Services
              </Link>
            </div>

            {/* HERO FEATURES */}

            <div
              className="
                mt-7 flex flex-wrap
                items-center gap-x-5 gap-y-3
                border-t border-white/20
                pt-4
              "
            >
              <span className="flex items-center gap-2 text-[10px] text-white/90">
                <Gem
                  size={15}
                  strokeWidth={1.5}
                  className="text-[#F7DDE4]"
                  aria-hidden="true"
                />
                Custom Designs
              </span>

              <span className="flex items-center gap-2 text-[10px] text-white/90">
                <Heart
                  size={15}
                  strokeWidth={1.5}
                  className="text-[#F7DDE4]"
                  aria-hidden="true"
                />
                Quality Care
              </span>

              <span className="flex items-center gap-2 text-[10px] text-white/90">
                <CalendarDays
                  size={15}
                  strokeWidth={1.5}
                  className="text-[#F7DDE4]"
                  aria-hidden="true"
                />
                Easy Booking
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================
          THE NAIL EDIT
      ===================================== */}

      <section
        id="nail-edit"
        className="
          overflow-hidden
          bg-[#FFF7F8]
          px-4 pt-10 pb-8
          md:pt-12 md:pb-10
        "
      >
        <div className="mx-auto mb-6 max-w-[650px] text-center">
          <div className="flex items-center justify-center gap-4">
            <span
              className="hidden h-px w-12 bg-[#EFA1B7] sm:block"
              aria-hidden="true"
            />

            <p
              className="
                text-[9px] font-semibold
                uppercase tracking-[0.3em]
                text-[#963F60]
              "
            >
              Featured Nail Art
            </p>

            <span
              className="hidden h-px w-12 bg-[#EFA1B7] sm:block"
              aria-hidden="true"
            />
          </div>

          <h2
            className="
              mt-2 font-serif
              text-[clamp(2.5rem,4vw,3.4rem)]
              font-normal leading-none
              text-[#29252B]
            "
          >
            The Nail Edit
          </h2>

          <p className="mt-2 text-[12px] text-[#70636A]">
            A look at some of our most loved sets.
          </p>
        </div>

        <div className="mx-auto max-w-[1150px]">
          <ServiceCarousel images={carouselImages} />
        </div>
      </section>

      {/* =====================================
          THREE SERVICE CATEGORIES
      ===================================== */}

      <section
        id="featured-services"
        className="
          bg-[#F7DDE4]/60
          px-5 py-7
          md:py-9
        "
      >
        <div
          className="
            mx-auto grid max-w-[1100px]
            grid-cols-1
            md:grid-cols-3
          "
        >
          {featuredServices.map((service, index) => {
            const Icon = service.icon;

            return (
              <article
                key={service.title}
                className={`
                  px-5 py-5 text-center
                  md:px-7 md:py-2
                  ${
                    index > 0
                      ? 'border-t border-[#963F60]/15 md:border-l md:border-t-0'
                      : ''
                  }
                `}
              >
                <Icon
                  size={22}
                  strokeWidth={1.4}
                  className="mx-auto mb-2 text-[#963F60]"
                  aria-hidden="true"
                />

                <h3
                  className="
                    font-serif text-[23px]
                    font-medium
                    leading-tight
                    text-[#29252B]
                  "
                >
                  {service.title}
                </h3>

                <p
                  className="
                    mx-auto mt-1
                    max-w-[290px]
                    text-[11px]
                    leading-[1.6]
                    text-[#70636A]
                  "
                >
                  {service.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      {/* =====================================
          PINK SATIN BOOKING BANNER
      ===================================== */}

      <section
        className="
          relative isolate
          flex min-h-[160px]
          items-center justify-center
          overflow-hidden
          bg-[#963F60]
          px-6 py-7
          text-center text-white
          md:min-h-[180px]
        "
      >
        {/* SATIN BACKGROUND */}

        <div
          className="
            absolute inset-0 -z-20
            bg-[url('/pink-satin.png')]
            bg-cover bg-center
            bg-no-repeat
          "
          aria-hidden="true"
        />

        {/* DARK BERRY OVERLAY */}

        <div
          className="
            absolute inset-0 -z-10
            bg-[#4A142B]/65
          "
          aria-hidden="true"
        />

        {/* BANNER CONTENT */}

        <div className="mx-auto max-w-[650px]">
          <h2
            className="
              font-serif
              text-[clamp(2rem,4vw,2.9rem)]
              font-normal italic
              leading-tight text-white
            "
          >
            Ready for Your Next Set?
          </h2>

          <p
            className="
              mx-auto mt-2
              text-[11px]
              leading-relaxed
              text-white/90
              sm:text-[12px]
            "
          >
            Book your appointment today and
            let's create something beautiful.
          </p>

          <Link
            to="/book"
            className="
              mt-4 inline-flex min-h-[36px]
              items-center justify-center
              gap-2 rounded-[5px]
              bg-[#FFF7F8]
              px-6 py-2
              text-[11px] font-semibold
              text-[#963F60]
              transition-colors duration-200
              hover:bg-[#F7DDE4]
            "
          >
            Book Now

            <ArrowRight
              size={14}
              aria-hidden="true"
            />
          </Link>
        </div>
      </section>
    </main>
  );
};

export default Home;
