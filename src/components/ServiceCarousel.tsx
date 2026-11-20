
import React from 'react';

interface ServiceCarouselProps {
  images: string[];
}

const ServiceCarousel: React.FC<ServiceCarouselProps> = ({
  images,
}) => {
  return (
    <div className="w-full overflow-hidden bg-[#FFF7F8] py-2">
      <div className="carousel-container">
        <div className="carousel-track">

          {/* FIRST SET OF IMAGES */}

          {images.map((image, index) => (
            <div
              key={`first-${index}`}
              className="
                carousel-item
                !w-[135px] !h-[210px]
                sm:!w-[175px] sm:!h-[255px]
                lg:!w-[220px] lg:!h-[300px]
                xl:!w-[260px] xl:!h-[350px]
                !shrink-0
                overflow-hidden
                rounded-xl
              "
            >
              <img
                src={image}
                alt={`Service ${index + 1}`}
                loading="lazy"
                className="
                  block h-full w-full
                  rounded-xl
                  border-2 border-gray-800
                  object-cover object-center
                "
              />
            </div>
          ))}

          {/* DUPLICATE SET FOR SEAMLESS LOOP */}

          {images.map((image, index) => (
            <div
              key={`second-${index}`}
              className="
                carousel-item
                !w-[135px] !h-[210px]
                sm:!w-[175px] sm:!h-[255px]
                lg:!w-[220px] lg:!h-[300px]
                xl:!w-[260px] xl:!h-[350px]
                !shrink-0
                overflow-hidden
                rounded-xl
              "
              aria-hidden="true"
            >
              <img
                src={image}
                alt=""
                loading="lazy"
                className="
                  block h-full w-full
                  rounded-xl
                  border-2 border-gray-800
                  object-cover object-center
                "
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ServiceCarousel;
