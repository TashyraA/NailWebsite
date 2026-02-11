import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Star, Clock, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ServiceCarousel from '@/components/ServiceCarousel';

const Home = () => {
  // Service carousel images
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

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#FFE9EF] via-[#FFC9D7] to-[#FFBCCD] py-12 sm:py-16 md:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/hero-background.jpg')] bg-cover bg-center opacity-35"></div>
        
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 sm:gap-4 mb-6 sm:mb-8 overflow-hidden">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold animate-slide-in-right" style={{ fontFamily: '"Cormorant Garamond", serif' }}>
                Welcome
              </h1>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold animate-slide-in-left" style={{ fontFamily: '"Cormorant Garamond", serif' }}>
                Beautiful
              </h1>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/services" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto bg-[#FF8CAA] hover:bg-[#FF6B96] text-white font-semibold shadow-lg hover:shadow-xl transition-all px-6 py-2">
                  Browse Services
                  <ArrowRight className="ml-2" size={16} />
                </Button>
              </Link>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 md:gap-6 mt-12 sm:mt-16 max-w-4xl mx-auto">
            <div className="bg-[#FFE9EF] rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-800">
              <div className="bg-[#FF8CAA] w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-3 md:mb-4">
                <Star className="text-white" size={16} />
              </div>
              <h3 className="text-xs sm:text-sm md:text-lg font-semibold mb-1 sm:mb-2 text-gray-800">Premium Quality</h3>
              <p className="text-gray-700 text-xs sm:text-xs md:text-sm">Top-tier products and expert techniques</p>
            </div>

            <div className="bg-[#FFE9EF] rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-800">
              <div className="bg-[#FF8CAA] w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-3 md:mb-4">
                <Clock className="text-white" size={16} />
              </div>
              <h3 className="text-xs sm:text-sm md:text-lg font-semibold mb-1 sm:mb-2 text-gray-800">Flexible Booking</h3>
              <p className="text-gray-700 text-xs sm:text-xs md:text-sm">Easy online scheduling at your convenience</p>
            </div>

            <div className="bg-[#FFE9EF] rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-800">
              <div className="bg-[#FF8CAA] w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-3 md:mb-4">
                <Award className="text-white" size={16} />
              </div>
              <h3 className="text-xs sm:text-sm md:text-lg font-semibold mb-1 sm:mb-2 text-gray-800">Certified Artists</h3>
              <p className="text-gray-700 text-xs sm:text-xs md:text-sm">Trained professionals dedicated to excellence</p>
            </div>
          </div>
        </div>
      </section>

      {/* Separator Line */}
      <div className="border-t border-gray-800" style={{ borderWidth: '1px' }}></div>

      {/* Service Carousel */}
      {carouselImages.length > 0 && <ServiceCarousel images={carouselImages} />}

      {/* Mission Section */}
      <section className="bg-gradient-to-r from-[#FFBCCD] to-[#FFC9D7] py-16">
        <div className="container mx-auto px-4">
          {/* Decorative Vintage Frame */}
          <div className="max-w-6xl mx-auto relative">
            {/* Outer frame border with glitter background */}
            <div className="border-4 border-gray-800 rounded-lg p-8 relative" style={{
              backgroundImage: 'url(/glitter-texture-2.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}>
              {/* Inner decorative border - solid background to hide glitter behind content */}
              <div className="border-2 border-gray-800 rounded-md p-8 relative bg-gradient-to-r from-[#FFBCCD] to-[#FFC9D7]">
                {/* Corner decorations */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-gray-800 -translate-x-2 -translate-y-2"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-gray-800 translate-x-2 -translate-y-2"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-gray-800 -translate-x-2 translate-y-2"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-gray-800 translate-x-2 translate-y-2"></div>
                
                {/* Content inside frame */}
                <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
                  {/* Left Side - Oval Portrait */}
                  <div className="flex justify-center md:justify-start flex-shrink-0">
                    <div className="relative w-64 h-80">
                      <div className="absolute inset-0 rounded-[50%] overflow-hidden border-4 border-gray-800 shadow-2xl">
                        <img
                          src="/briana-portrait.jpg"
                          alt="Briana - Licensed Manicurist"
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Center - Heart Decoration */}
                  <div className="flex justify-center items-center flex-shrink-0">
                    <img
                      src="/heart-decoration.png"
                      alt="Heart decoration"
                      className="w-24 h-24 object-contain"
                    />
                  </div>

                  {/* Right Side - Mission Statement */}
                  <div className="text-left space-y-4 flex-1">
                    <p className="text-lg md:text-xl text-gray-800 leading-relaxed">
                      Hi, my name is Briana. I am a licensed manicurist based in Cleveland, OH. 
                      My passion in life has always been beauty. I have taken the opportunity to 
                      make others not only look beautiful, but to feel beautiful as well through 
                      doing nails. I handle every client with love, care, respect, and proficiency. 
                      Your nail dreams can come true in one appointment.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Book Now Button */}
            <div className="flex justify-center mt-12">
            <Link to="/services">
              <Button size="lg" className="bg-[#FF8CAA] hover:bg-[#FF6B96] text-white font-semibold shadow-xl px-12 py-6 text-xl">
                  Book Now
                  <ArrowRight className="ml-3" size={24} />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Thick Bottom Border */}
      <div className="border-t border-gray-800" style={{ borderWidth: '3px' }}></div>
    </div>
  );
};

export default Home;
