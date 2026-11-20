
import React, { useState } from 'react';
import { Service } from '@/types';

import {
  Clock3,
  ShoppingBag,
  Check,
  ImageOff,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';

interface ServiceCardProps {
  service: Service;
}

/* =========================================
   INLOVENAILZ BY BRIANA
   LUXURY MARBLE SPA MENU

   - Uses /marble.png from public folder
   - Horizontal luxury menu design
   - Circular nail photos
   - Elegant champagne-gold borders
   - No favorite hearts or logic
   - No visible category badges
   - Category data preserved
   - Existing booking functionality preserved
========================================= */

const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
}) => {
  const { addToCart } = useCart();
  const { toast } = useToast();

  const [imageFailed, setImageFailed] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const image = service.images?.[0];

  /* =====================================
     FORMAT DURATION
  ===================================== */

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;

    if (hours === 0) {
      return `${remaining} min`;
    }

    if (remaining === 0) {
      return `${hours} hr`;
    }

    return `${hours} hr ${remaining} min`;
  };

  /* =====================================
     SERVICE PRICE LABELS
  ===================================== */

  const priceLabels: Record<string, string> = {
    'acrylic-long-xl': '$100–$140',
    'freestyle-short': '$90+',
    'bling-french': '$20–$30',
    'nail-repair': '$6–$10',
  };

  const priceLabel =
    priceLabels[service.id] ??
    `$${service.price.toFixed(2).replace(/\.00$/, '')}`;

  const hasVariablePrice =
    Object.prototype.hasOwnProperty.call(
      priceLabels,
      service.id
    );

  /* =====================================
     ADD TO BOOKING
  ===================================== */

  const handleAddToCart = () => {
    addToCart(service);
    setJustAdded(true);

    toast({
      title: 'Added to booking! 💗',
      description: `${service.title} has been added to your booking.`,
    });
  };

  return (
    <article
      data-category={service.category}
      className="
        group relative flex h-full flex-col
        overflow-hidden rounded-[28px]
        border border-[#E5C17B]
        bg-[#FFF7F8]
        shadow-[0_10px_30px_rgba(150,63,96,0.09)]
        transition-all duration-300
        hover:-translate-y-1
        hover:shadow-[0_18px_45px_rgba(150,63,96,0.15)]
        sm:flex-row sm:items-center
      "
      style={{
        backgroundImage: "url('/marble.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* SUBTLE WHITE OVERLAY FOR READABILITY */}

      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute inset-0
          bg-white/15
        "
      />

      {/* =====================================
          CIRCULAR SERVICE PHOTO
      ===================================== */}

      <div
        className="
          relative z-10 mx-auto mt-6
          h-[205px] w-[205px]
          shrink-0
          overflow-hidden rounded-full
          border-[5px] border-[#E5C17B]
          bg-[#F7DDE4]
          shadow-[0_8px_24px_rgba(150,63,96,0.12)]
          sm:ml-6 sm:mr-0 sm:mt-0
          sm:h-[165px] sm:w-[165px]
          lg:h-[185px] lg:w-[185px]
        "
      >
        {image && !imageFailed ? (
          <img
            src={image}
            alt={`${service.title} nail service`}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="
              block h-full w-full
              object-contain object-center
              transition-transform duration-500
              group-hover:scale-[1.03]
            "
          />
        ) : (
          <div
            className="
              flex h-full w-full flex-col
              items-center justify-center
              gap-2 text-[#963F60]
            "
          >
            <ImageOff
              size={30}
              strokeWidth={1.5}
            />

            <span className="px-4 text-center text-xs">
              Photo coming soon
            </span>
          </div>
        )}
      </div>

      {/* =====================================
          SERVICE INFORMATION
      ===================================== */}

      <div
        className="
          relative z-10 flex min-w-0
          flex-1 flex-col
          p-5 sm:p-6
        "
      >
        {/* SERVICE TITLE */}

        <h3
          className="
            font-serif text-[23px]
            leading-tight text-[#38212A]
            sm:text-[24px]
          "
        >
          {service.title}
        </h3>

        {/* DESCRIPTION */}

        <p
          className="
            mt-2 text-sm
            leading-relaxed text-[#806B75]
          "
        >
          {service.description}
        </p>

        {/* =====================================
            DURATION AND DEPOSIT
        ===================================== */}

        <div
          className="
            mt-4 flex flex-wrap
            items-center gap-x-4 gap-y-2
            text-xs font-medium
            text-[#704C5B]
            sm:text-sm
          "
        >
          <div className="flex items-center gap-2">
            <Clock3
              size={17}
              className="text-[#C76B8A]"
            />

            <span>
              {formatDuration(service.duration)}
            </span>
          </div>

          <span
            className="hidden h-4 w-px bg-[#E9C5D0] sm:block"
            aria-hidden="true"
          />

          <div className="flex items-center gap-2">
            <span
              className="
                flex h-6 w-6
                items-center justify-center
                rounded-full bg-[#F7DDE4]
                text-xs font-bold
                text-[#963F60]
              "
            >
              $
            </span>

            <span>
              ${service.deposit} deposit
            </span>
          </div>
        </div>

        {/* DIVIDER */}

        <div className="my-4 h-px w-full bg-[#EAC8D2]" />

        {/* =====================================
            PRICE AND BOOKING BUTTON
        ===================================== */}

        <div
          className="
            mt-auto flex flex-col
            gap-4
            xl:flex-row xl:items-end
            xl:justify-between
          "
        >
          {/* PRICE */}

          <div className="min-w-0">
            <p
              className="
                mb-1 text-[10px]
                font-semibold uppercase
                tracking-[0.18em]
                text-[#A57C8C]
              "
            >
              {hasVariablePrice
                ? 'Starting price / range'
                : 'Service price'}
            </p>

            <p
              className="
                text-[30px] font-bold
                leading-none text-[#963F60]
              "
            >
              {priceLabel}
            </p>

            {hasVariablePrice && (
              <p className="mt-2 text-xs text-[#8E7A85]">
                Final price may vary.
              </p>
            )}
          </div>

          {/* ADD TO BOOKING */}

          <Button
            type="button"
            onClick={handleAddToCart}
            className="
              h-12 w-full
              shrink-0 rounded-full
              border-0 bg-[#963F60]
              px-5 text-sm font-semibold
              text-white
              shadow-[0_6px_18px_rgba(150,63,96,0.18)]
              transition-all duration-300
              hover:-translate-y-0.5
              hover:bg-[#79324F]
              hover:shadow-[0_10px_24px_rgba(150,63,96,0.28)]
              focus-visible:outline
              focus-visible:outline-2
              focus-visible:outline-offset-2
              focus-visible:outline-[#963F60]
              xl:w-auto
            "
          >
            {justAdded ? (
              <>
                <Check size={17} className="mr-2" />
                Add Another
              </>
            ) : (
              <>
                <ShoppingBag size={17} className="mr-2" />
                Add to Booking
              </>
            )}
          </Button>
        </div>
      </div>
    </article>
  );
};

export default ServiceCard;
