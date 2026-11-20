
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import ServiceCarousel from '@/components/ServiceCarousel';

/* =========================================
   INLOVENAILZ — RESPONSIVE HOMEPAGE
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
    <main className="min-h-screen w-full min-w-0 overflow-x-clip bg-[#FFF7F8] text-[#29252B]">

      {/* =====================================
          HERO SECTION
          SLIGHTLY TALLER — NO CROPPING
      ===================================== */}

      <section className="relative isolate w-full overflow-hidden bg-[#21191F] text-white">

        {/*
          FULL-WIDTH STUDIO PHOTO

          The photo is slightly stretched vertically
          on smaller screens when needed.

          No object-cover cropping.
          No empty background strips.
          Natural proportions return on desktop.
        */}

        <img
          src="/hero-background.png"
          alt="InLoveNailz nail studio"
          fetchPriority="high"
          className="
            block h-auto w-full max-w-none
            min-h-[225px]
            sm:min-h-[290px]
            md:min-h-0
          "
        />

        {/* GRADIENT OVER IMAGE */}

        <div
          className="
            pointer-events-none
            absolute inset-0 z-0
            bg-gradient-to-r
            from-[#21191F]/90
            via-[#21191F]/55
            to-transparent
            md:from-[#21191F]/85
            md:via-[#21191F]/45
            lg:from-[#21191F]/65
            lg:via-[#21191F]/25
          "
          aria-hidden="true"
        />

        {/* HERO CONTENT OVER IMAGE */}

        <div
          className="
            absolute inset-0 z-10
            mx-auto flex w-full
            max-w-[1180px]
            items-center
            px-3 py-2
            sm:px-6 sm:py-3
            md:px-8 md:py-6
            lg:px-10
          "
        >
          <div className="w-full min-w-0 max-w-[510px]">

            {/* LOCATION */}

            <div className="mb-1 flex flex-wrap items-center gap-2 sm:mb-2 md:mb-4">
              <p
                className="
                  text-[clamp(6px,1.6vw,10px)]
                  font-semibold uppercase
                  tracking-[0.08em]
                  text-[#F7DDE4]
                  sm:tracking-[0.18em]
                  md:tracking-[0.28em]
                "
              >
                Cleveland, Ohio · Licensed Manicurist
              </p>

              <span
                className="hidden h-px w-9 shrink-0 bg-[#EFA1B7]/65 md:block"
                aria-hidden="true"
              />
            </div>

            {/* MAIN HEADLINE */}

            <h1
              className="
                max-w-full font-serif
                text-[clamp(15px,4.5vw,62px)]
                font-normal leading-[1.04]
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
                mt-1 max-w-[410px]
                text-[clamp(7px,1.7vw,13px)]
                leading-[1.35]
                text-white/90
                sm:mt-2 sm:leading-[1.5]
                md:mt-4 md:leading-[1.8]
              "
            >
              Elevated nail sets, detailed designs,
              and a personalized experience that
              brings your vision to life.
            </p>

            {/* HERO BUTTONS */}

            <div className="mt-2 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2 md:mt-6 md:gap-3">
              <Link
                to="/book"
                className="
                  inline-flex min-h-[27px]
                  items-center justify-center
                  gap-1 rounded-[5px]
                  bg-[#963F60]
                  px-2 py-1
                  text-center text-[8px]
                  font-semibold text-white
                  transition-colors duration-200
                  hover:bg-[#79324F]
                  sm:min-h-[34px]
                  sm:px-3 sm:text-[10px]
                  md:min-h-[44px]
                  md:gap-2 md:px-6
                  md:py-2.5 md:text-[11px]
                "
              >
                Book an Appointment
                <ArrowRight
                  size={12}
                  className="shrink-0 md:h-[14px] md:w-[14px]"
                  aria-hidden="true"
                />
              </Link>

              <Link
                to="/services"
                className="
                  inline-flex min-h-[27px]
                  items-center justify-center
                  rounded-[5px]
                  border border-white/60
                  px-2 py-1
                  text-center text-[8px]
                  font-semibold text-white
                  transition-colors duration-200
                  hover:bg-white/10
                  sm:min-h-[34px]
                  sm:px-3 sm:text-[10px]
                  md:min-h-[44px]
                  md:px-6 md:py-2.5
                  md:text-[11px]
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
          w-full overflow-hidden
          bg-[#FFF7F8]
          px-3 pb-8 pt-9
          sm:px-5 sm:pt-10
          md:pb-10 md:pt-12
        "
      >
        <div className="mx-auto mb-6 max-w-[650px] px-2 text-center">
          <div className="flex items-center justify-center gap-3 sm:gap-4">
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
              text-[clamp(2.1rem,6vw,3.4rem)]
              font-normal leading-[1.1]
              text-[#29252B]
            "
          >
            The Nail Edit
          </h2>

          <p className="mx-auto mt-2 max-w-[400px] text-[12px] leading-relaxed text-[#70636A]">
            A look at some of our most loved sets.
          </p>
        </div>

        <div className="mx-auto w-full min-w-0 max-w-[1150px] overflow-hidden">
          <ServiceCarousel images={carouselImages} />
        </div>
      </section>

      {/* =====================================
          THREE SERVICE CATEGORIES
          THREE ACROSS ON MOBILE
      ===================================== */}

      <section
        id="featured-services"
        className="
          w-full bg-[#F7DDE4]/60
          px-2 py-5
          sm:px-6 sm:py-8
          md:py-9
        "
      >
        <div
          className="
            mx-auto grid w-full
            max-w-[1100px]
            grid-cols-3
          "
        >
          {featuredServices.map((service, index) => (
            <article
              key={service.title}
              className={`
                flex min-w-0 flex-col
                items-center justify-start
                px-1.5 py-3 text-center
                sm:px-5 sm:py-4
                md:px-4
                lg:px-7
                ${
                  index > 0
                    ? 'border-l border-[#963F60]/15'
                    : ''
                }
              `}
            >
              {/* CUSTOM HAND ILLUSTRATION */}

              <img
                src="/inlovenailz-hand-icon.png"
                alt=""
                aria-hidden="true"
                loading="lazy"
                width={60}
                height={60}
                className="
                  mx-auto mb-2
                  block h-8 w-8
                  shrink-0 object-contain
                  min-[400px]:h-10
                  min-[400px]:w-10
                  sm:h-[54px] sm:w-[54px]
                  lg:h-[60px] lg:w-[60px]
                "
              />

              <h3
                className="
                  font-serif
                  text-[clamp(0.9rem,3.5vw,1.45rem)]
                  font-medium leading-tight
                  text-[#29252B]
                  [overflow-wrap:anywhere]
                "
              >
                {service.title}
              </h3>

              <p
                className="
                  mx-auto mt-1
                  max-w-[290px]
                  text-[10px]
                  leading-[1.45]
                  text-[#70636A]
                  sm:text-[11px]
                  sm:leading-[1.6]
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
          relative isolate w-full
          overflow-hidden
          bg-[#FFF9FA]
          px-7 py-14
          sm:px-10 sm:py-16
          md:px-12
          lg:px-16
        "
      >
        {/* SOFT PINK NEON TUBING BORDER */}

        <div
          className="
            pointer-events-none
            absolute inset-[10px]
            z-20
            rounded-[22px]
            border-[3px] border-[#FFEAF2]
            sm:inset-[16px]
            sm:rounded-[30px]
            lg:inset-[18px]
            lg:rounded-[34px]
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
            absolute inset-[12px]
            z-0
            rounded-[20px]
            shadow-[inset_0_0_35px_rgba(255,153,190,0.12)]
            sm:inset-[18px]
            sm:rounded-[28px]
            lg:inset-[20px]
            lg:rounded-[32px]
          "
          aria-hidden="true"
        />

        {/* SOFT BACKGROUND GLOW */}

        <div
          className="
            pointer-events-none
            absolute -left-24 top-0
            -z-10
            h-[220px] w-[220px]
            rounded-full
            bg-[#F7DDE4]/35
            blur-[70px]
            sm:h-[300px] sm:w-[300px]
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
            mx-auto grid w-full
            max-w-[940px]
            min-w-0 items-center
            gap-7
            md:grid-cols-[minmax(0,280px)_minmax(0,1fr)]
            md:gap-9
            lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]
            lg:gap-12
          "
        >
          {/* PORTRAIT */}

          <div
            className="
              relative mx-auto
              w-full max-w-[230px]
              sm:max-w-[270px]
              md:max-w-[280px]
              lg:max-w-[320px]
            "
          >
            {/* OFFSET FRAME */}

            <div
              className="
                absolute
                -bottom-2 -right-2
                left-2 top-2
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
                border-[4px] border-white
                bg-[#F7DDE4]
                shadow-[0_14px_35px_rgba(112,43,68,0.12)]
                sm:border-[5px]
              "
            >
              <img
                src="/briana-portrait.jpg"
                alt="Briana, licensed manicurist and nail artist behind InLoveNailz"
                loading="lazy"
                className="
                  block aspect-[4/4.6]
                  h-auto w-full
                  object-cover object-top
                "
              />
            </div>
          </div>

          {/* ABOUT TEXT */}

          <div className="min-w-0 text-center md:text-left">

            {/* EYEBROW */}

            <div
              className="
                flex flex-wrap items-center
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
                  text-[9px] font-semibold
                  uppercase tracking-[0.2em]
                  text-[#963F60]
                  sm:text-[10px]
                  sm:tracking-[0.26em]
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
                text-[clamp(2.1rem,5vw,3.6rem)]
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
                text-[clamp(1.05rem,2vw,1.3rem)]
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
                text-[12px]
                leading-[1.8]
                text-[#766D73]
                sm:text-[13px]
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
          flex w-full min-h-[160px]
          items-center justify-center
          overflow-hidden
          bg-[#963F60]
          px-5 py-9
          text-center text-white
          sm:px-6
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

        <div className="mx-auto w-full max-w-[650px]">
          <h2
            className="
              font-serif
              text-[clamp(1.8rem,5vw,2.9rem)]
              font-normal italic
              leading-[1.15] text-white
            "
          >
            Ready for Your Next Set?
          </h2>

          <p
            className="
              mx-auto mt-3
              max-w-[460px]
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
              mt-5 inline-flex min-h-[44px]
              items-center justify-center
              gap-2 rounded-[5px]
              bg-[#FFF7F8]
              px-6 py-2.5
              text-[11px] font-semibold
              text-[#963F60]
              transition-colors duration-200
              hover:bg-[#F7DDE4]
            "
          >
            Book Now
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
};

export default Home;
