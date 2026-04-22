import React from 'react';

interface ServiceCarouselProps {
  images: string[];
}

const ServiceCarousel: React.FC<ServiceCarouselProps> = ({ images }) => {
  return (
    <div className="w-full overflow-hidden bg-gradient-to-r from-[#FFBCCD] to-[#FFC9D7] py-8">
      <div className="carousel-container">
        <div className="carousel-track">
          {/* First set of images */}
          {images.map((image, index) => (
            <div
              key={`first-${index}`}
              className="carousel-item"
            >
              <img
                src={image}
                alt={`Service ${index + 1}`}
                className="w-full h-full object-cover border-2 border-gray-800"
              />
            </div>
          ))}
          {/* Duplicate set for seamless loop */}
          {images.map((image, index) => (
            <div
              key={`second-${index}`}
              className="carousel-item"
            >
              <img
                src={image}
                alt={`Service ${index + 1}`}
                className="w-full h-full object-cover border-2 border-gray-800"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ServiceCarousel;
