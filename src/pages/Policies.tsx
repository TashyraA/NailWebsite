
import { Link } from "react-router-dom";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock3,
  CreditCard,
  Heart,
  HeartPulse,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

/* =========================================
   INLOVENAILZ BY BRIANA
   LUXURY APPOINTMENT POLICIES

   - Elegant botanical rose decorations
   - Blush pink, ivory, and berry palette
   - Seven salon policies
   - Appointment and deposit details preserved
   - Responsive desktop and mobile layout
========================================= */

const policies = [
  {
    title: "Cancellations",
    description:
      "Please provide at least 24 hours' notice if you need to cancel your appointment.",
    icon: CalendarDays,
  },
  {
    title: "Non-Refundable Deposits",
    description:
      "All booking deposits are non-refundable.",
    icon: CreditCard,
  },
  {
    title: "Grace Period",
    description:
      "A 15-minute grace period is allowed for late arrivals. If you arrive more than 15 minutes late, your appointment will need to be rescheduled.",
    icon: Clock3,
  },
  {
    title: "Nail Health & Safety",
    description:
      "For the health and safety of everyone, services may be declined if there are signs of infection, open wounds, or other conditions that could compromise a safe service.",
    icon: ShieldCheck,
  },
  {
    title: "Complimentary Nail Repairs",
    description:
      "Nail repairs needed within three days of your appointment are complimentary.",
    icon: Sparkles,
  },
  {
    title: "Guest Policy",
    description:
      "You are welcome to bring one or two guests to your appointment. Please ensure that all guests are respectful of the salon environment, workspace, and business.",
    icon: Users,
  },
  {
    title: "Health & Wellness",
    description:
      "If you are feeling unwell or experiencing symptoms of illness, please stay home and contact us regarding your appointment.",
    icon: HeartPulse,
  },
];

/* =========================================
   BOTANICAL ROSE CORNER DECORATION

   Inline SVG:
   - No external images required
   - Scales cleanly on all devices
   - Decorative and hidden from screen readers
========================================= */

const BotanicalRose = ({
  className = "",
}: {
  className?: string;
}) => {
  return (
    <svg
      viewBox="0 0 280 340"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* MAIN FLOWING STEM */}

      <path
        d="
          M -20 320
          C 45 285, 65 235, 90 180
          C 110 135, 145 100, 195 55
        "
        stroke="#B98292"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* SECONDARY BRANCHES */}

      <path
        d="M 65 235 C 35 215, 18 190, 10 160"
        stroke="#B98292"
        strokeWidth="1.8"
      />

      <path
        d="M 95 170 C 125 175, 160 160, 190 135"
        stroke="#B98292"
        strokeWidth="1.8"
      />

      <path
        d="M 135 110 C 115 85, 110 55, 120 25"
        stroke="#B98292"
        strokeWidth="1.8"
      />

      {/* LEAVES */}

      <g fill="#DDB9C3" fillOpacity="0.7">
        <path d="M 65 235 C 20 238, 8 260, 0 285 C 35 275, 55 255, 65 235 Z" />
        <path d="M 85 195 C 55 175, 35 145, 45 115 C 80 135, 92 165, 85 195 Z" />
        <path d="M 110 145 C 150 140, 175 115, 185 90 C 145 95, 120 115, 110 145 Z" />
        <path d="M 45 215 C 20 205, 5 180, 10 155 C 40 170, 52 190, 45 215 Z" />
        <path d="M 145 100 C 135 65, 145 35, 165 15 C 170 55, 160 80, 145 100 Z" />
        <path d="M 155 155 C 190 155, 220 135, 235 110 C 195 110, 170 125, 155 155 Z" />
      </g>

      {/* LEAF VEINS */}

      <g
        stroke="#B98292"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.6"
      >
        <path d="M 65 235 L 12 275" />
        <path d="M 85 195 L 48 125" />
        <path d="M 110 145 L 180 95" />
        <path d="M 45 215 L 12 160" />
        <path d="M 145 100 L 163 20" />
        <path d="M 155 155 L 230 115" />
      </g>

      {/* ROSE BLOOM */}

      <g transform="translate(194 54)">
        {/* OUTER PETALS */}

        <path
          d="
            M 0 -35
            C -24 -48, -45 -25, -35 -5
            C -52 12, -30 38, -10 30
            C 8 48, 35 28, 30 10
            C 48 -8, 25 -38, 0 -35 Z
          "
          fill="#EBCBD4"
          fillOpacity="0.8"
          stroke="#B98292"
          strokeWidth="1.5"
        />

        {/* INNER PETALS */}

        <path
          d="
            M -22 -12
            C -12 -28, 10 -28, 20 -12
            C 30 3, 15 22, 0 20
            C -18 25, -30 5, -22 -12 Z
          "
          fill="#F4DFE5"
          stroke="#B98292"
          strokeWidth="1.4"
        />

        {/* ROSE CENTER */}

        <path
          d="
            M -10 0
            C -5 -12, 10 -12, 12 0
            C 15 10, 0 15, -5 6
            C -10 0, 0 -5, 5 0
          "
          stroke="#A86F82"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </g>

      {/* SMALL BUD */}

      <g transform="translate(118 24)">
        <path
          d="
            M 0 0
            C -12 -12, -10 -28, 0 -32
            C 12 -28, 12 -12, 0 0 Z
          "
          fill="#EBCBD4"
          stroke="#B98292"
          strokeWidth="1.4"
        />

        <path
          d="M 0 0 C -3 -12, -2 -22, 0 -32"
          stroke="#B98292"
          strokeWidth="1"
        />
      </g>
    </svg>
  );
};

/* =========================================
   HEART DIVIDER
========================================= */

const HeartDivider = () => (
  <div
    className="flex items-center justify-center gap-4"
    aria-hidden="true"
  >
    <span className="h-px w-12 bg-[#D9A7B7] sm:w-20" />

    <Heart
      size={23}
      strokeWidth={1.3}
      className="text-[#963F60]"
    />

    <span className="h-px w-12 bg-[#D9A7B7] sm:w-20" />
  </div>
);

/* =========================================
   POLICIES PAGE
========================================= */

const Policies = () => {
  return (
    <main className="min-h-screen overflow-hidden bg-[#FFF7F8] text-[#29252B]">

      {/* =====================================
          PAGE BACKGROUND
      ===================================== */}

      <section
        className="
          relative overflow-hidden
          bg-gradient-to-b
          from-[#FFF7F8]
          via-[#FFF0F3]
          to-[#F7DDE4]
          px-4 pb-20 pt-10
          sm:px-6 sm:pb-24 sm:pt-14
          lg:px-8
        "
      >
        {/* SOFT BACKGROUND GLOW */}

        <div
          className="
            pointer-events-none
            absolute -left-32 top-20
            h-[350px] w-[350px]
            rounded-full
            bg-[#F7DDE4]/60
            blur-[100px]
          "
          aria-hidden="true"
        />

        <div
          className="
            pointer-events-none
            absolute -right-32 bottom-20
            h-[400px] w-[400px]
            rounded-full
            bg-[#EAC5D0]/40
            blur-[110px]
          "
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-[1050px]">

          {/* =====================================
              BACK TO HOME
          ===================================== */}

          <Link
            to="/"
            className="
              mb-8 inline-flex
              items-center gap-2
              text-sm font-semibold
              text-[#963F60]
              transition-colors duration-200
              hover:text-[#69263F]
              sm:mb-10
            "
          >
            <ArrowLeft size={17} />
            Back to Home
          </Link>

          {/* =====================================
              MAIN POLICY SHEET
          ===================================== */}

          <div
            className="
              relative overflow-hidden
              rounded-[26px]
              border border-[#E6B7C5]
              bg-[#FFF9F9]
              p-3
              shadow-[0_20px_70px_rgba(112,43,68,0.10)]
              sm:rounded-[36px]
              sm:p-5
              lg:p-6
            "
          >
            {/* =====================================
                BOTANICAL ROSE DECORATIONS
            ===================================== */}

            {/* UPPER LEFT ROSE */}

            <BotanicalRose
              className="
                pointer-events-none
                absolute -left-12 -top-10
                z-0
                h-[220px] w-[185px]
                opacity-55
                sm:-left-10 sm:-top-12
                sm:h-[300px] sm:w-[250px]
                lg:h-[350px] lg:w-[290px]
              "
            />

            {/* LOWER RIGHT ROSE */}

            <BotanicalRose
              className="
                pointer-events-none
                absolute -bottom-12 -right-12
                z-0
                h-[220px] w-[185px]
                rotate-180
                opacity-55
                sm:-bottom-16 sm:-right-12
                sm:h-[300px] sm:w-[250px]
                lg:h-[350px] lg:w-[290px]
              "
            />

            {/* SUBTLE BACKGROUND GLOW */}

            <div
              className="
                pointer-events-none
                absolute -left-24 -top-24
                h-[260px] w-[260px]
                rounded-full
                bg-[#F7DDE4]/40
                blur-[65px]
              "
              aria-hidden="true"
            />

            <div
              className="
                pointer-events-none
                absolute -bottom-28 -right-24
                h-[300px] w-[300px]
                rounded-full
                bg-[#EAC5D0]/35
                blur-[75px]
              "
              aria-hidden="true"
            />

            {/* INNER DECORATIVE BORDER */}

            <div
              className="
                relative z-10
                rounded-[18px]
                border border-[#E8C6D0]
                px-4 pb-10 pt-10
                sm:rounded-[27px]
                sm:px-10 sm:pb-14 sm:pt-14
                lg:px-16
              "
            >
              {/* =====================================
                  BRAND HEADING
              ===================================== */}

              <div className="text-center">

                <p
                  className="
                    text-[11px]
                    font-semibold uppercase
                    tracking-[0.30em]
                    text-[#963F60]
                    sm:text-xs
                    sm:tracking-[0.45em]
                  "
                >
                  InLoveNailz
                </p>

                <p
                  className="
                    mt-2 font-serif
                    text-xl italic
                    text-[#74334E]
                    sm:text-2xl
                  "
                >
                  by Briana
                </p>

                <div className="mt-6">
                  <HeartDivider />
                </div>

                {/* MAIN TITLE */}

                <h1
                  className="
                    mt-7 font-serif
                    text-[clamp(2.5rem,6vw,4.8rem)]
                    font-normal leading-[1.08]
                    tracking-tight
                    text-[#29252B]
                  "
                >
                  Appointment{" "}
                  <span className="italic text-[#963F60]">
                    Policies.
                  </span>
                </h1>

                <p
                  className="
                    mx-auto mt-5
                    max-w-[530px]
                    text-sm leading-7
                    text-[#765E6B]
                    sm:text-base
                  "
                >
                  A little preparation helps make
                  every appointment a beautiful experience.
                  Please review these important reminders
                  before your visit.
                </p>
              </div>

              {/* =====================================
                  REMINDERS RIBBON
              ===================================== */}

              <div
                className="
                  mx-auto mb-10 mt-10
                  flex max-w-[740px]
                  items-center justify-center
                  gap-3 rounded-full
                  bg-[#963F60]
                  px-5 py-4
                  text-center
                  shadow-[0_8px_20px_rgba(150,63,96,0.12)]
                  sm:mb-12
                "
              >
                <span
                  className="
                    text-[10px]
                    font-semibold uppercase
                    tracking-[0.15em]
                    text-white
                    sm:text-xs
                    sm:tracking-[0.28em]
                  "
                >
                  A Few Important Reminders
                </span>

                <Heart
                  size={17}
                  strokeWidth={1.5}
                  className="shrink-0 text-[#F7DDE4]"
                  aria-hidden="true"
                />
              </div>

              {/* =====================================
                  POLICY LIST
              ===================================== */}

              <div className="mx-auto max-w-[750px]">
                <div className="space-y-8 sm:space-y-10">
                  {policies.map(policy => {
                    const Icon = policy.icon;

                    return (
                      <article
                        key={policy.title}
                        className="
                          group flex items-start
                          gap-4
                          sm:gap-7
                        "
                      >
                        {/* ICON CIRCLE */}

                        <div
                          className="
                            flex h-[58px] w-[58px]
                            shrink-0 items-center
                            justify-center
                            rounded-full
                            border border-[#F0D4DC]
                            bg-[#F7DDE4]
                            text-[#963F60]
                            transition-transform duration-300
                            group-hover:scale-105
                            sm:h-[72px] sm:w-[72px]
                          "
                        >
                          <Icon
                            size={27}
                            strokeWidth={1.4}
                            className="sm:h-[31px] sm:w-[31px]"
                            aria-hidden="true"
                          />
                        </div>

                        {/* POLICY TEXT */}

                        <div
                          className="
                            min-w-0 flex-1
                            border-l-2
                            border-[#E2B1C0]
                            pl-4
                            sm:pl-6
                          "
                        >
                          <h2
                            className="
                              font-serif
                              text-xl font-normal
                              leading-tight
                              text-[#74334E]
                              sm:text-[26px]
                            "
                          >
                            {policy.title}
                          </h2>

                          <p
                            className="
                              mt-2
                              text-[13px]
                              leading-6
                              text-[#66535C]
                              sm:text-[15px]
                              sm:leading-7
                            "
                          >
                            {policy.description}
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              {/* =====================================
                  CLOSING MESSAGE
              ===================================== */}

              <div className="mt-14 text-center sm:mt-16">
                <HeartDivider />

                <p
                  className="
                    mx-auto mt-6
                    max-w-[550px]
                    font-serif
                    text-2xl italic
                    leading-relaxed
                    text-[#963F60]
                    sm:text-3xl
                  "
                >
                  Thank you for your understanding.
                  I can't wait to see you!
                </p>

                <Heart
                  size={20}
                  strokeWidth={1.4}
                  className="mx-auto mt-4 text-[#963F60]"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>

          {/* =====================================
              APPOINTMENT INFORMATION
          ===================================== */}

          <div
            className="
              mt-10 grid gap-5
              md:grid-cols-2
            "
          >
            {/* APPOINTMENT REQUESTS */}

            <div
              className="
                rounded-[24px]
                border border-[#EAC5D0]
                bg-white/85
                p-6
                shadow-[0_8px_25px_rgba(112,43,68,0.05)]
                sm:p-8
              "
            >
              <div className="flex items-center gap-3">
                <div
                  className="
                    flex h-11 w-11
                    items-center justify-center
                    rounded-full
                    bg-[#F7DDE4]
                    text-[#963F60]
                  "
                >
                  <CalendarDays
                    size={22}
                    strokeWidth={1.6}
                  />
                </div>

                <h2
                  className="
                    font-serif text-2xl
                    text-[#29252B]
                  "
                >
                  Appointment Requests
                </h2>
              </div>

              <p
                className="
                  mt-4 text-sm
                  leading-7
                  text-[#765E6B]
                "
              >
                Submitting an appointment request
                does not automatically confirm your
                booking. Briana will review your
                request, and you will receive a
                confirmation or decision by email.
              </p>
            </div>

            {/* DEPOSIT INFORMATION */}

            <div
              className="
                rounded-[24px]
                border border-[#EAC5D0]
                bg-white/85
                p-6
                shadow-[0_8px_25px_rgba(112,43,68,0.05)]
                sm:p-8
              "
            >
              <div className="flex items-center gap-3">
                <div
                  className="
                    flex h-11 w-11
                    items-center justify-center
                    rounded-full
                    bg-[#F7DDE4]
                    text-[#963F60]
                  "
                >
                  <CreditCard
                    size={22}
                    strokeWidth={1.6}
                  />
                </div>

                <h2
                  className="
                    font-serif text-2xl
                    text-[#29252B]
                  "
                >
                  Deposit & Payment
                </h2>
              </div>

              <p
                className="
                  mt-4 text-sm
                  leading-7
                  text-[#765E6B]
                "
              >
                A $20 non-refundable deposit is
                requested per appointment, not per
                individual service. A secure payment
                link is emailed after you submit your
                appointment request.
              </p>

              <p
                className="
                  mt-3 text-sm
                  leading-7
                  text-[#765E6B]
                "
              >
                Your remaining service balance is
                due at your appointment.
              </p>
            </div>
          </div>

          {/* =====================================
              CONTACT & BOOKING BANNER
          ===================================== */}

          <div
            className="
              relative mt-8
              overflow-hidden
              rounded-[26px]
              border border-[#EAC5D0]
              bg-[#FFF1F5]
              p-7
              text-center
              shadow-[0_10px_30px_rgba(112,43,68,0.07)]
              sm:p-10
            "
          >
            {/* SATIN BACKGROUND */}

            <div
              className="
                pointer-events-none
                absolute inset-0
                bg-[url('/pink-satin.png')]
                bg-cover bg-center
                opacity-25
              "
              aria-hidden="true"
            />

            <div className="relative">
              <Heart
                size={27}
                strokeWidth={1.4}
                className="mx-auto text-[#963F60]"
                aria-hidden="true"
              />

              <h2
                className="
                  mt-4 font-serif
                  text-3xl
                  text-[#29252B]
                  sm:text-4xl
                "
              >
                Ready for Your{" "}
                <span className="italic text-[#963F60]">
                  Next Set?
                </span>
              </h2>

              <p
                className="
                  mx-auto mt-3
                  max-w-[530px]
                  text-sm leading-7
                  text-[#765E6B]
                "
              >
                We look forward to creating
                something beautiful with you.
                Have a question about our policies?
                We're happy to help.
              </p>

              {/* ACTION BUTTONS */}

              <div
                className="
                  mt-7 flex flex-col
                  items-center justify-center
                  gap-3
                  sm:flex-row
                "
              >
                <Link
                  to="/book"
                  className="
                    inline-flex min-h-[48px]
                    w-full items-center
                    justify-center gap-2
                    rounded-full
                    bg-[#963F60]
                    px-7 py-3
                    text-sm font-semibold
                    text-white
                    shadow-md
                    transition-all duration-200
                    hover:-translate-y-0.5
                    hover:bg-[#74334E]
                    hover:shadow-lg
                    sm:w-auto
                  "
                >
                  Request Appointment

                  <ArrowRight size={17} />
                </Link>

                <Link
                  to="/contact"
                  className="
                    inline-flex min-h-[48px]
                    w-full items-center
                    justify-center gap-2
                    rounded-full
                    border border-[#963F60]
                    bg-white/75
                    px-7 py-3
                    text-sm font-semibold
                    text-[#963F60]
                    transition-all duration-200
                    hover:-translate-y-0.5
                    hover:bg-[#F7DDE4]
                    sm:w-auto
                  "
                >
                  <Mail size={17} />

                  Contact Briana
                </Link>
              </div>
            </div>
          </div>

          {/* =====================================
              FINAL NOTE
          ===================================== */}

          <p
            className="
              mx-auto mt-8
              max-w-[650px]
              text-center
              text-xs leading-6
              text-[#8E7A85]
            "
          >
            By requesting an appointment,
            you acknowledge that you have
            reviewed the salon policies above.
            Please contact us if you have
            any questions before your visit.
          </p>
        </div>
      </section>
    </main>
  );
};

export default Policies;
