
import React, { useState } from 'react';
import { Service } from '@/types';
import {
  Clock3,
  Heart,
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

  const [isFavorite, setIsFavorite] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const image = service.images?.[0];

  // Display appointment durations clearly.
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

  // Some services have variable final prices.
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

    // The cart remains the source of truth.
    // Reset the temporary button label when the
    // component is used again.
  };

  const handleFavorite = () => {
    setIsFavorite(previous => !previous);
  };

  return (
    <article
      className="
        group flex h-full flex-col
        overflow-hidden rounded-[24px]
        border border-[#F7DDE4]
        bg-white
        shadow-[0_8px_30px_rgba(150,63,96,0.08)]
        transition-all duration-300
        hover:-translate-y-1
        hover:shadow-[0_18px_45px_rgba(150,63,96,0.16)]
      "
    >
      {/* NAIL PHOTO */}
      <div
        className="
          relative aspect-[4/3]
          overflow-hidden bg-[#F7DDE4]
        "
      >
        {image && !imageFailed ? (
          <img
            src={image}
            alt={`${service.title} nail service`}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="
              h-full w-full object-cover
              transition-transform duration-700
              group-hover:scale-105
            "
          />
        ) : (
          <div
            className="
              flex h-full w-full flex-col
              items-center justify-center
              gap-3 bg-[#FFF1F5]
              text-[#963F60]
            "
          >
            <ImageOff size={32} strokeWidth={1.5} />

            <span className="px-4 text-center text-xs font-medium">
              Photo coming soon
            </span>
          </div>
        )}

        {/* CATEGORY */}
        <span
          className="
            absolute left-3 top-3
            max-w-[75%]
            rounded-full bg-white/95
            px-3 py-1.5
            text-[10px] font-semibold
            uppercase tracking-[0.08em]
            text-[#963F60]
            shadow-sm backdrop-blur-sm
            sm:text-xs
          "
        >
          {service.category}
        </span>

        {/* FAVORITE BUTTON */}
        <button
          type="button"
          onClick={handleFavorite}
          aria-label={
            isFavorite
              ? `Remove ${service.title} from favorites`
              : `Add ${service.title} to favorites`
          }
          aria-pressed={isFavorite}
          className="
            absolute right-3 top-3
            flex h-10 w-10
            items-center justify-center
            rounded-full bg-white/95
            text-[#963F60]
            shadow-sm backdrop-blur-sm
            transition-all duration-200
            hover:scale-110
            focus-visible:outline
            focus-visible:outline-2
            focus-visible:outline-offset-2
            focus-visible:outline-[#963F60]
          "
        >
          <Heart
            size={19}
            fill={isFavorite ? '#EFA1B7' : 'none'}
            strokeWidth={1.8}
          />
        </button>
      </div>

      {/* CARD CONTENT */}
      <div
        className="
          flex flex-1 flex-col
          px-5 pb-5 pt-5
          sm:px-6 sm:pb-6
        "
      >
        {/* SERVICE NAME */}
        <h3
          className="
            mb-2 text-lg font-bold
            leading-snug text-[#29252B]
            sm:text-xl
          "
        >
          {service.title}
        </h3>

        {/* DESCRIPTION */}
        <p
          className="
            mb-5 line-clamp-3
            min-h-[60px]
            text-sm leading-relaxed
            text-[#766D73]
          "
        >
          {service.description}
        </p>

        {/* DURATION AND DEPOSIT */}
        <div
          className="
            mb-5 flex flex-wrap
            items-center gap-x-5 gap-y-2
            border-t border-[#F7DDE4]
            pt-4
          "
        >
          <div
            className="
              flex items-center gap-2
              text-xs font-medium
              text-[#6D6269]
              sm:text-sm
            "
          >
            <Clock3
              size={16}
              className="text-[#C76B8A]"
            />

            <span>
              {formatDuration(service.duration)}
            </span>
          </div>

          <div
            className="
              flex items-center gap-2
              text-xs font-medium
              text-[#6D6269]
              sm:text-sm
            "
          >
            <span
              className="
                flex h-5 w-5
                items-center justify-center
                rounded-full bg-[#FCEAF0]
                text-[11px] font-bold
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

        {/* PRICE */}
        <div className="mb-5 mt-auto">
          <p
            className="
              mb-1 text-[11px]
              font-semibold uppercase
              tracking-[0.14em]
              text-[#A28B96]
            "
          >
            {hasVariablePrice
              ? 'Starting price / range'
              : 'Service price'}
          </p>

          <p
            className="
              text-[27px] font-bold
              leading-tight text-[#963F60]
              sm:text-[30px]
            "
          >
            {priceLabel}
          </p>

          {hasVariablePrice && (
            <p className="mt-1 text-xs text-[#8E7A85]">
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
            rounded-xl border-0
            bg-[#963F60]
            text-sm font-semibold
            text-white
            shadow-[0_5px_15px_rgba(150,63,96,0.15)]
            transition-all duration-300
            hover:bg-[#7D3250]
            hover:shadow-[0_8px_20px_rgba(150,63,96,0.25)]
          "
        >
          {justAdded ? (
            <>
              <Check size={18} className="mr-2" />
              Add Another
            </>
          ) : (
            <>
              <ShoppingBag size={18} className="mr-2" />
              Add to Booking
            </>
          )}
        </Button>
      </div>
    </article>
  );
};

export default ServiceCard;
