
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

const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
}) => {
  const { addToCart } = useCart();
  const { toast } = useToast();

  const [imageFailed, setImageFailed] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const image = service.images?.[0];

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
        group relative flex h-full min-w-0
        flex-col overflow-hidden
        rounded-[17px]
        border border-[#E5C17B]
        bg-[#FFF7F8]
        shadow-[0_8px_22px_rgba(150,63,96,0.09)]
        transition-all duration-300
        hover:shadow-[0_14px_35px_rgba(150,63,96,0.15)]
        sm:rounded-[24px]
        xl:flex-row xl:items-center
      "
      style={{
        backgroundImage: "url('/marble.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* WHITE OVERLAY */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-white/15"
      />

      {/* RESPONSIVE CIRCULAR PHOTO */}

      <div
        className="
          relative z-10 mx-auto mt-3
          h-[clamp(78px,25vw,112px)]
          w-[clamp(78px,25vw,112px)]
          shrink-0 overflow-hidden
          rounded-full
          border-[3px] border-[#E5C17B]
          bg-[#F7DDE4]
          shadow-[0_6px_18px_rgba(150,63,96,0.12)]
          sm:mt-5
          sm:h-[145px] sm:w-[145px]
          lg:h-[165px] lg:w-[165px]
          xl:ml-5 xl:mr-0 xl:mt-0
          xl:h-[145px] xl:w-[145px]
          2xl:h-[165px] 2xl:w-[165px]
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
              gap-1 text-[#963F60]
            "
          >
            <ImageOff
              size={22}
              strokeWidth={1.5}
            />

            <span className="px-2 text-center text-[9px] leading-tight sm:text-xs">
              Photo coming soon
            </span>
          </div>
        )}
      </div>

      {/* SERVICE INFORMATION */}

      <div
        className="
          relative z-10 flex min-w-0
          flex-1 flex-col
          p-2.5 pt-3
          sm:p-5
          xl:p-5
        "
      >
        {/* TITLE */}

        <h3
          className="
            break-words font-serif
            text-[15px] leading-[1.2]
            text-[#38212A]
            sm:text-[21px]
            lg:text-[23px]
          "
        >
          {service.title}
        </h3>

        {/* DESCRIPTION */}

        <p
          className="
            mt-1.5 break-words
            text-[10px] leading-[1.45]
            text-[#806B75]
            sm:mt-2 sm:text-sm
          "
        >
          {service.description}
        </p>

        {/* SERVICE DURATION */}

        <div
          className="
            mt-3 flex flex-col
            items-start gap-1.5
            text-[10px] font-medium
            text-[#704C5B]
            sm:mt-4 sm:flex-row
            sm:flex-wrap sm:gap-x-4
            sm:gap-y-2 sm:text-xs
            lg:text-sm
          "
        >
          <div className="flex items-center gap-1.5">
            <Clock3
              size={14}
              className="shrink-0 text-[#C76B8A]"
            />

            <span>
              {formatDuration(service.duration)}
            </span>
          </div>
        </div>

        {/* DIVIDER */}

        <div className="my-3 h-px w-full bg-[#EAC8D2] sm:my-4" />

        {/* PRICE AND BOOKING */}

        <div
          className="
            mt-auto flex min-w-0
            flex-col gap-3
            xl:flex-row xl:items-end
            xl:justify-between
          "
        >
          <div className="min-w-0">
            <p
              className="
                mb-1 text-[8px]
                font-semibold uppercase
                tracking-[0.1em]
                text-[#A57C8C]
                sm:text-[10px]
                sm:tracking-[0.18em]
              "
            >
              {hasVariablePrice
                ? 'Starting price / range'
                : 'Service price'}
            </p>

            <p
              className="
                break-words text-[20px]
                font-bold leading-none
                text-[#963F60]
                sm:text-[27px]
                lg:text-[30px]
              "
            >
              {priceLabel}
            </p>

            {hasVariablePrice && (
              <p className="mt-1.5 text-[9px] text-[#8E7A85] sm:text-xs">
                Final price may vary.
              </p>
            )}
          </div>

          {/* ADD TO BOOKING */}

          <Button
            type="button"
            onClick={handleAddToCart}
            className="
              h-auto min-h-[40px] w-full
              shrink-0 rounded-full
              border-0 bg-[#963F60]
              px-2 py-2
              text-[10px] font-semibold
              leading-tight text-white
              shadow-[0_6px_18px_rgba(150,63,96,0.18)]
              transition-all duration-300
              hover:bg-[#79324F]
              hover:shadow-[0_10px_24px_rgba(150,63,96,0.28)]
              focus-visible:outline
              focus-visible:outline-2
              focus-visible:outline-offset-2
              focus-visible:outline-[#963F60]
              sm:min-h-[46px]
              sm:px-4 sm:text-sm
              xl:w-auto
            "
          >
            {justAdded ? (
              <>
                <Check
                  size={14}
                  className="mr-1 shrink-0 sm:mr-2"
                />
                Add Another
              </>
            ) : (
              <>
                <ShoppingBag
                  size={14}
                  className="mr-1 shrink-0 sm:mr-2"
                />
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
