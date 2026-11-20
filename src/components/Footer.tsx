
import { Link } from "react-router-dom";
import { Instagram, Heart, ArrowUpRight } from "lucide-react";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full min-w-0 overflow-hidden border-t border-[#EAC5D0] bg-[#FFF7F8] text-[#29252B]">
      <div className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-9">

        {/* =====================================
            MAIN FOOTER GRID
            Mobile: Branding above 2 columns
            Desktop: 3 columns
        ===================================== */}

        <div className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-6 sm:gap-x-8 sm:gap-y-7 lg:grid-cols-3 lg:gap-10">

          {/* =====================================
              BRAND
          ===================================== */}

          <div className="col-span-2 min-w-0 lg:col-span-1">
            <Link
              to="/"
              className="inline-flex items-center gap-3"
              aria-label="InLoveNailz homepage"
            >
              <img
                src="/logo.png"
                alt="InLoveNailz by Briana"
                className="h-10 w-auto max-w-full object-contain sm:h-12"
              />
            </Link>

            <p className="mt-2 max-w-[440px] text-[12px] leading-[1.7] text-[#765E6B] sm:mt-3 sm:text-[13px] sm:leading-6 lg:max-w-xs">
              Beautiful nails, made with love. Explore our nail
              services and request your next appointment with Briana.
            </p>

            {/* INSTAGRAM */}

            <a
              href="https://www.instagram.com/briilovesnailz"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit InLoveNailz on Instagram"
              className="
                mt-3 inline-flex h-9 w-9
                items-center justify-center rounded-full
                border border-[#EAC5D0] bg-white
                text-[#963F60]
                transition-all duration-200
                hover:-translate-y-1
                hover:border-[#963F60]
                hover:bg-[#963F60]
                hover:text-white
                focus-visible:outline
                focus-visible:outline-2
                focus-visible:outline-offset-2
                focus-visible:outline-[#963F60]
              "
            >
              <Instagram size={17} aria-hidden="true" />
            </a>
          </div>

          {/* =====================================
              EXPLORE
          ===================================== */}

          <div className="min-w-0">
            <h2 className="mb-3 font-serif text-[17px] leading-tight text-[#963F60] sm:text-lg">
              Explore
            </h2>

            <nav
              aria-label="Footer navigation"
              className="flex min-w-0 flex-col gap-2.5"
            >
              <Link
                to="/"
                className="w-fit text-[12px] leading-relaxed text-[#765E6B] transition-colors hover:text-[#963F60] sm:text-[13px]"
              >
                Home
              </Link>

              <Link
                to="/services"
                className="w-fit text-[12px] leading-relaxed text-[#765E6B] transition-colors hover:text-[#963F60] sm:text-[13px]"
              >
                Nail Services
              </Link>

              <Link
                to="/cart"
                className="w-fit text-[12px] leading-relaxed text-[#765E6B] transition-colors hover:text-[#963F60] sm:text-[13px]"
              >
                Your Cart
              </Link>

              <Link
                to="/contact"
                className="w-fit text-[12px] leading-relaxed text-[#765E6B] transition-colors hover:text-[#963F60] sm:text-[13px]"
              >
                Contact Us
              </Link>
            </nav>
          </div>

          {/* =====================================
              BOOKING & POLICIES
          ===================================== */}

          <div className="min-w-0">
            <h2 className="mb-3 font-serif text-[17px] leading-tight text-[#963F60] sm:text-lg">
              Booking & Policies
            </h2>

            <div className="flex min-w-0 flex-col gap-2.5">

              {/* BOOKING POLICIES */}

              <Link
                to="/policies"
                className="
                  inline-flex w-fit max-w-full
                  items-start gap-1
                  text-[12px] leading-relaxed
                  text-[#765E6B]
                  transition-colors
                  hover:text-[#963F60]
                  sm:gap-2 sm:text-[13px]
                "
              >
                <span>Booking Policies</span>

                <ArrowUpRight
                  size={13}
                  className="mt-0.5 shrink-0"
                  aria-hidden="true"
                />
              </Link>

              {/* REQUEST APPOINTMENT */}

              <Link
                to="/book"
                className="
                  inline-flex w-fit max-w-full
                  items-start gap-1
                  text-[12px] leading-relaxed
                  text-[#765E6B]
                  transition-colors
                  hover:text-[#963F60]
                  sm:gap-2 sm:text-[13px]
                "
              >
                <span>Request Appointment</span>

                <ArrowUpRight
                  size={13}
                  className="mt-0.5 shrink-0"
                  aria-hidden="true"
                />
              </Link>
            </div>

            {/* APPOINTMENT NOTICE */}

            <p className="mt-3 max-w-[240px] text-[10px] leading-[1.6] text-[#8E7A85] sm:text-[11px] sm:leading-5">
              Appointments are requested online and are subject
              to confirmation.
            </p>
          </div>
        </div>

        {/* =====================================
            BOTTOM BAR
        ===================================== */}

        <div
          className="
            mt-6 flex min-w-0 flex-col
            items-center justify-between
            gap-2 border-t border-[#EAC5D0]
            pt-4 text-center
            sm:mt-7 sm:flex-row sm:text-left
          "
        >
          <p className="text-[10px] leading-relaxed text-[#8E7A85] sm:text-[11px]">
            © {year} InLoveNailz by Briana. All rights reserved.
          </p>

          <p className="flex items-center justify-center gap-1.5 text-[10px] text-[#963F60] sm:text-[11px]">
            Made with
            <Heart
              size={12}
              fill="currentColor"
              aria-hidden="true"
            />
            for beautiful nails
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
