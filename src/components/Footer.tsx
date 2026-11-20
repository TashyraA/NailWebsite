
import { Link } from "react-router-dom";
import { Instagram, Heart, ArrowUpRight } from "lucide-react";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[#EAC5D0] bg-[#FFF7F8] text-[#29252B]">
      <div className="mx-auto max-w-[1180px] px-5 py-7 sm:px-8 sm:py-8 lg:py-9">
        <div className="grid gap-7 md:grid-cols-3 md:gap-10">
          {/* =====================================
              BRAND
          ===================================== */}

          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-3"
            >
              <img
                src="/logo.png"
                alt="InLoveNailz by Briana"
                className="h-12 w-auto object-contain"
              />
            </Link>

            <p className="mt-3 max-w-xs text-[13px] leading-6 text-[#765E6B]">
              Beautiful nails, made with love. Explore our nail services
              and request your next appointment with Briana.
            </p>

            {/* SINGLE INSTAGRAM LINK */}

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
                hover:-translate-y-1 hover:border-[#963F60]
                hover:bg-[#963F60] hover:text-white
                focus-visible:outline focus-visible:outline-2
                focus-visible:outline-offset-2
                focus-visible:outline-[#963F60]
              "
            >
              <Instagram size={17} />
            </a>
          </div>

          {/* =====================================
              QUICK LINKS
          ===================================== */}

          <div>
            <h2 className="mb-3 font-serif text-lg text-[#963F60]">
              Explore
            </h2>

            <nav
              aria-label="Footer navigation"
              className="flex flex-col gap-2"
            >
              <Link
                to="/"
                className="w-fit text-[13px] text-[#765E6B] transition-colors hover:text-[#963F60]"
              >
                Home
              </Link>

              <Link
                to="/services"
                className="w-fit text-[13px] text-[#765E6B] transition-colors hover:text-[#963F60]"
              >
                Nail Services
              </Link>

              <Link
                to="/cart"
                className="w-fit text-[13px] text-[#765E6B] transition-colors hover:text-[#963F60]"
              >
                Your Cart
              </Link>

              <Link
                to="/contact"
                className="w-fit text-[13px] text-[#765E6B] transition-colors hover:text-[#963F60]"
              >
                Contact Us
              </Link>
            </nav>
          </div>

          {/* =====================================
              BOOKING & POLICIES
          ===================================== */}

          <div>
            <h2 className="mb-3 font-serif text-lg text-[#963F60]">
              Booking & Policies
            </h2>

            <div className="flex flex-col gap-2">
              {/* BOOKING POLICIES */}

              <Link
                to="/policies"
                className="
                  flex w-fit items-center gap-2
                  text-[13px] text-[#765E6B]
                  transition-colors hover:text-[#963F60]
                "
              >
                Booking Policies
                <ArrowUpRight size={14} />
              </Link>

              {/* REQUEST APPOINTMENT */}

              <Link
                to="/book"
                className="
                  flex w-fit items-center gap-2
                  text-[13px] text-[#765E6B]
                  transition-colors hover:text-[#963F60]
                "
              >
                Request Appointment
                <ArrowUpRight size={14} />
              </Link>
            </div>

            {/* APPOINTMENT NOTICE */}

            <p className="mt-3 max-w-xs text-[11px] leading-5 text-[#8E7A85]">
              Appointments are requested online and are subject to
              confirmation.
            </p>
          </div>
        </div>

        {/* =====================================
            BOTTOM BAR
        ===================================== */}

        <div
          className="
            mt-6 flex flex-col items-center
            justify-between gap-2
            border-t border-[#EAC5D0] pt-4
            text-center sm:flex-row sm:text-left
          "
        >
          <p className="text-[11px] text-[#8E7A85]">
            © {year} InLoveNailz by Briana. All rights reserved.
          </p>

          <p className="flex items-center gap-1.5 text-[11px] text-[#963F60]">
            Made with
            <Heart size={12} fill="currentColor" />
            for beautiful nails
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
