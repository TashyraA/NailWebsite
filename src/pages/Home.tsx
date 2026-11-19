import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Diamond, Gem, Layers3 } from 'lucide-react';
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
      <section className="relative min-h-[390px] overflow-hidden bg-[#29252B] text-white md:min-h-[410px]">
        <div className="absolute inset-0 bg-[url('/hero-background.jpg')] bg-cover bg-[center_right] md:bg-center"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#29252B] via-[#29252B]/90 to-[#963F60]/10"></div>
        <div className="relative mx-auto flex min-h-[390px] max-w-[1180px] items-center px-6 py-12 md:min-h-[410px] md:px-8">
          <div className="max-w-[470px]">
            <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#EFA1B7]">Cleveland, Ohio · Licensed Manicurist</p>
            <h1 className="font-serif text-5xl leading-[0.95] tracking-tight md:text-[58px]">Custom Nails.<br /><span className="text-[#F7DDE4]">Signature Artistry.</span></h1>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-[#FFF7F8]/90">Elevated nail sets, detailed designs, and a personalized experience that bring your vision to life.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/book" className="rounded-md bg-[#963F60] px-5 py-3 text-xs font-semibold text-white transition hover:bg-[#EFA1B7] hover:text-[#29252B]">Book an Appointment <ArrowRight className="ml-2 inline" size={14} /></Link>
              <Link to="/services" className="rounded-md border border-[#FFF7F8]/60 px-5 py-3 text-xs font-semibold text-white transition hover:border-[#EFA1B7] hover:text-[#EFA1B7]">View Services</Link>
            </div>
            <div className="mt-8 flex gap-6 text-[11px] text-[#FFF7F8]/85">
              <span className="flex items-center gap-2"><Gem size={16} /> Custom Design</span>
              <span className="flex items-center gap-2"><Diamond size={16} /> Quality Care</span>
              <span className="hidden items-center gap-2 sm:flex"><CalendarDays size={16} /> Easy Booking</span>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#FFF7F8] px-4 py-12 text-[#29252B]">
        <div className="mx-auto max-w-[1100px] text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-[#963F60]">Featured Nail Art</p>
          <h2 className="mt-1 font-serif text-4xl md:text-[42px]">The Nail Edit</h2>
          <p className="mt-1 text-sm text-[#963F60]">A look at some of our most loved sets.</p>
          {carouselImages.length > 0 && <div className="mt-7"><ServiceCarousel images={carouselImages.slice(0, 5)} /></div>}
          <div className="mx-auto mt-8 grid max-w-[760px] divide-y divide-[#F7DDE4] border-y border-[#F7DDE4] md:grid-cols-3 md:divide-x md:divide-y-0">
            <div className="px-4 py-5"><Layers3 className="mx-auto mb-2 text-[#963F60]" size={20} /><h3 className="font-serif text-lg">Full Sets</h3><p className="mt-1 text-[10px] text-[#963F60]">Acrylic, gel, and custom sets</p></div>
            <div className="px-4 py-5"><Diamond className="mx-auto mb-2 text-[#963F60]" size={20} /><h3 className="font-serif text-lg">Manicures</h3><p className="mt-1 text-[10px] text-[#963F60]">Clean, polished, and long-lasting</p></div>
            <div className="px-4 py-5"><Gem className="mx-auto mb-2 text-[#963F60]" size={20} /><h3 className="font-serif text-lg">Nail Art Add-On</h3><p className="mt-1 text-[10px] text-[#963F60]">Rhinestones, charms, and hand-painted designs</p></div>
          </div>
        </div>
      </section>

      <section className="bg-[#963F60] px-4 py-8 text-center text-white">
        <p className="font-serif text-3xl italic">Ready for Your Next Set?</p>
        <p className="mt-2 text-xs text-[#FFF7F8]/90">Book your appointment today and let&apos;s create something beautiful.</p>
        <Link to="/book" className="mt-4 inline-block rounded-md bg-[#FFF7F8] px-5 py-2.5 text-xs font-semibold text-[#963F60]">Book Now <ArrowRight className="ml-1 inline" size={13} /></Link>
      </section>

      {/* Mission Section */}
      <section className="bg-gradient-to-r from-[#FFBCCD] to-[#FFC9D7] py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {/* Antique Frame Container */}
            <div 
              className="relative border-8 border-gray-800 rounded-lg shadow-2xl p-6"
              style={{
                background: `url(/glitter-texture-2.jpg)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderImage: 'linear-gradient(45deg, #000000, #333333, #000000, #333333) 1',
                borderStyle: 'solid',
                borderWidth: '8px'
              }}
            >
              {/* Mobile Layout - Stacked */}
              <div className="block md:hidden text-center space-y-4">
                {/* Portrait */}
                <div className="flex justify-center">
                  <div className="relative w-20 h-24">
                    <div className="absolute inset-0 rounded-[50%] overflow-hidden border-3 border-gray-800 shadow-xl">
                      <img
                        src="/briana-portrait.jpg"
                        alt="Briana - Licensed Manicurist"
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Heart */}
                <div className="flex justify-center">
                  <img
                    src="/heart-decoration.png"
                    alt="Heart decoration"
                    className="w-12 h-12 object-contain"
                  />
                </div>
                
                {/* Text */}
                <div className="bg-white/30 backdrop-blur-sm border-2 border-gray-800 rounded-lg p-4">
                  <p className="text-sm font-bold text-gray-800 leading-relaxed">
                    Hi, my name is Briana. I am a licensed manicurist based in Cleveland, OH. 
                    My passion in life has always been beauty. I make others not only look beautiful, 
                    but feel beautiful as well through doing nails. I handle every client with love, 
                    care, respect, and proficiency. Your nail dreams can come true in one appointment.
                  </p>
                </div>
              </div>

              {/* Desktop Layout - Picture Left, Heart Middle, Text Right */}
              <div className="hidden md:flex items-center gap-6">
                {/* Left - Portrait */}
                <div className="flex-shrink-0">
                  <div className="relative w-40 h-48">
                    <div className="absolute inset-0 rounded-[50%] overflow-hidden border-4 border-gray-800 shadow-xl">
                      <img
                        src="/briana-portrait.jpg"
                        alt="Briana - Licensed Manicurist"
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                  </div>
                </div>

                {/* Middle - Heart Decoration */}
                <div className="flex-shrink-0 flex justify-center">
                  <img
                    src="/heart-decoration.png"
                    alt="Heart decoration"
                    className="w-16 h-16 object-contain"
                  />
                </div>

                {/* Right - Mission Text */}
                <div className="flex-1">
                  <div className="bg-white/30 backdrop-blur-sm border-2 border-gray-800 rounded-lg p-6">
                    <p className="text-lg font-bold text-gray-800 leading-relaxed">
                      Hi, my name is Briana. I am a licensed manicurist based in Cleveland, OH. 
                      My passion in life has always been beauty. I make others not only look beautiful, 
                      but feel beautiful as well through doing nails. I handle every client with love, 
                      care, respect, and proficiency. Your nail dreams can come true in one appointment.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Book Now Button */}
            <div className="flex justify-center mt-6">
              <Link to="/services">
                <Button className="bg-[#FF8CAA] hover:bg-[#FF6B96] text-white font-semibold shadow-lg px-8 py-2">
                  Book Now
                  <ArrowRight className="ml-2" size={18} />
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
