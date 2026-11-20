
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

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

/* =========================================
   FEATURED SERVICES

   Uses the custom berry-pink hand illustration
   stored in public/inlovenailz-hand-icon.png
========================================= */

const featuredServices = [
  {
    title: 'Full Sets',
    description: 'Acrylic, gel, and custom sets',
  },
  {
    title: 'Manicures',
    description: 'Clean, polished, and long-lasting',
  },
  {
    title: 'Nail Art Add-Ons',
    description:
      'Rhinestones, charms, hand-painted designs & more',
  },
];

/* =========================================
   DECORATIVE SINGLE-LINE HEART
========================================= */

const FlowingHeart = ({
  className = '',
}: {
  className?: string;
}) => (
  <svg
    viewBox="0 0 420 140"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    preserveAspectRatio="xMidYMid meet"
  >
    <path
      d="
        M 4 91
        C 38 43, 77 67, 113 85
        C 155 106, 188 112, 215 91
        C 237 74, 251 51, 245 30
        C 239 9, 215 10, 210 29
        C 204 49, 229 76, 246 90
        C 261 72, 280 44, 278 28
        C 276 10, 257 8, 246 25
        C 229 51, 250 88, 281 94
        C 315 101, 345 71, 416 82
      "
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

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
        {/* HERO IMAGE */}

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

        {/* GRADIENT FOR TEXT READABILITY */}

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
            relative z-10 mx-auto
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
          {featuredServices.map((service, index) => (
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
              {/* CUSTOM ELEGANT HAND ILLUSTRATION */}

              <img
                src="/inlovenailz-hand-icon.png"
                alt=""
                aria-hidden="true"
                loading="lazy"
                className="
                  mx-auto mb-2
                  block h-[55px] w-[55px]
                  object-contain
                  sm:h-[60px] sm:w-[60px]
                "
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
          ))}
        </div>
      </section>

      {/* =====================================
          MEET YOUR NAIL ARTIST
      ===================================== */}

      <section
        id="about"
        aria-labelledby="about-heading"
        className="
          relative isolate overflow-hidden
          bg-[#FFF9FA]
          px-8 py-14
          sm:px-12 sm:py-16
          lg:px-16 lg:py-16
        "
      >
        {/* SOFT PINK NEON TUBING BORDER */}

        <div
          className="
            pointer-events-none
            absolute inset-[12px]
            z-20
            rounded-[28px]
            border-[3px] border-[#FFEAF2]
            sm:inset-[18px]
            sm:rounded-[34px]
          "
          style={{
            boxShadow: `
              0 0 5px rgba(255,255,255,0.95),
              0 0 12px rgba(255,153,190,0.65),
              0 0 24px rgba(255,153,190,0.30),
              inset 0 0 12px rgba(255,153,190,0.16)
            `,
          }}
          aria-hidden="true"
        />

        {/* INNER PINK LIGHT REFLECTION */}

        <div
          className="
            pointer-events-none
            absolute inset-[14px]
            z-0
            rounded-[26px]
            shadow-[inset_0_0_35px_rgba(255,153,190,0.12)]
            sm:inset-[20px]
            sm:rounded-[32px]
          "
          aria-hidden="true"
        />

        {/* SOFT BACKGROUND GLOW */}

        <div
          className="
            pointer-events-none
            absolute -left-24 top-0
            -z-10
            h-[300px] w-[300px]
            rounded-full
            bg-[#F7DDE4]/35
            blur-[80px]
          "
          aria-hidden="true"
        />

        {/* SINGLE LEFT-SIDE CURSIVE HEART */}

        <FlowingHeart
          className="
            pointer-events-none
            absolute
            left-[-100px] top-1/2
            hidden
            h-[140px] w-[420px]
            -translate-y-1/2
            text-[#963F60]/80
            lg:block
            xl:left-[-35px]
            2xl:left-0
          "
        />

        {/* MAIN ABOUT CONTENT */}

        <div
          className="
            relative z-10
            mx-auto grid
            max-w-[940px]
            items-center
            gap-8
            md:grid-cols-[320px_1fr]
            md:gap-12
            lg:gap-16
          "
        >
          {/* PORTRAIT */}

          <div
            className="
              relative mx-auto
              w-full max-w-[260px]
              sm:max-w-[280px]
              md:max-w-[320px]
            "
          >
            {/* OFFSET FRAME */}

            <div
              className="
                absolute
                -bottom-2 -right-3
                left-3 top-3
                rounded-t-[160px]
                rounded-b-[14px]
                border border-[#C9809B]/45
              "
              aria-hidden="true"
            />

            {/* IMAGE */}

            <div
              className="
                relative overflow-hidden
                rounded-t-[160px]
                rounded-b-[14px]
                border-[5px] border-white
                bg-[#F7DDE4]
                shadow-[0_14px_35px_rgba(112,43,68,0.12)]
              "
            >
              <img
                src="/briana-portrait.jpg"
                alt="Briana, licensed manicurist and nail artist behind InLoveNailz"
                loading="lazy"
                className="
                  block aspect-[4/4.6]
                  w-full
                  object-cover object-top
                "
              />
            </div>
          </div>

          {/* ABOUT TEXT */}

          <div className="text-center md:text-left">

            {/* EYEBROW */}

            <div
              className="
                flex items-center
                justify-center gap-3
                md:justify-start
              "
            >
              <span
                className="h-px w-7 bg-[#C9809B]"
                aria-hidden="true"
              />

              <p
                className="
                  text-[10px] font-semibold
                  uppercase tracking-[0.26em]
                  text-[#963F60]
                "
              >
                Meet Your Nail Artist
              </p>
            </div>

            {/* HEADING */}

            <h2
              id="about-heading"
              className="
                mt-4 font-serif
                text-[clamp(2.5rem,4vw,3.6rem)]
                font-normal
                leading-[1.1]
                tracking-[-0.03em]
                text-[#29252B]
              "
            >
              Hi, I'm{' '}
              <span className="italic text-[#963F60]">
                Briana.
              </span>
            </h2>

            {/* DECORATIVE DIVIDER */}

            <div
              className="
                mx-auto mt-5
                h-px w-16
                bg-[#DFA2B5]
                md:mx-0
              "
              aria-hidden="true"
            />

            {/* INTRODUCTION */}

            <p
              className="
                mx-auto mt-5
                max-w-[490px]
                font-serif
                text-[clamp(1.1rem,1.8vw,1.3rem)]
                leading-[1.55]
                text-[#3D3038]
                md:mx-0
              "
            >
              A Cleveland-based licensed manicurist
              with a passion for helping you look
              and feel beautiful.
            </p>

            {/* PERSONAL MESSAGE */}

            <p
              className="
                mx-auto mt-4
                max-w-[470px]
                text-[13px]
                leading-[1.8]
                text-[#766D73]
                md:mx-0
              "
            >
              Every appointment is about creativity,
              care, and bringing your nail vision
              to life.
            </p>
          </div>
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
