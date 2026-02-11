import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Instagram } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { Badge } from '@/components/ui/badge';

const Header = () => {
  const location = useLocation();
  const { getItemCount } = useCart();
  const itemCount = getItemCount();

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
    <header className="sticky top-0 z-50 bg-[#FFE9EF]/90 backdrop-blur-md border-b border-[#FFC9D7] shadow-sm">
      <div className="container mx-auto px-4 py-3">
        {/* Mobile Header - Centered Logo */}
        <div className="md:hidden flex items-center justify-between relative">
          <div className="absolute inset-0 flex justify-center items-center">
            <Link to="/" className="flex items-center gap-2 group">
              <img 
                src="/logo.png" 
                alt="InLoveNailz Logo" 
                className="h-28 w-auto object-contain group-hover:scale-105 transition-transform"
              />
            </Link>
          </div>
          <div className="relative z-10 ml-auto">
            <Link to="/cart" className="relative">
              <div className="p-2 rounded-lg hover:bg-[#FFC9D7] transition-colors">
                <ShoppingCart className="text-[#FF8CAA]" size={22} />
                {itemCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 bg-[#FFBCCD] text-white border-0 min-w-[20px] h-5 flex items-center justify-center text-xs font-semibold">
                    {itemCount}
                  </Badge>
                )}
              </div>
            </Link>
          </div>
        </div>

        {/* Desktop Header - Original Layout */}
        <div className="hidden md:flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <img 
              src="/logo.png" 
              alt="InLoveNailz Logo" 
              className="h-24 w-auto object-contain group-hover:scale-105 transition-transform"
            />
          </Link>

          <nav className="flex items-center gap-10">
            <Link
              to="/"
              className={`font-medium transition-all text-lg text-gray-700 hover:text-gray-900 pb-1 px-3 ${
                isActive('/') ? 'border-b-2 border-gray-800' : 'border-b-2 border-transparent hover:border-gray-800'
              }`}
            >
              Home
            </Link>
            <Link
              to="/services"
              className={`font-medium transition-all text-lg text-gray-700 hover:text-gray-900 pb-1 px-3 ${
                isActive('/services') ? 'border-b-2 border-gray-800' : 'border-b-2 border-transparent hover:border-gray-800'
              }`}
            >
              Services
            </Link>
            <Link
              to="/contact"
              className={`font-medium transition-all text-lg text-gray-700 hover:text-gray-900 pb-1 px-3 ${
                isActive('/contact') ? 'border-b-2 border-gray-800' : 'border-b-2 border-transparent hover:border-gray-800'
              }`}
            >
              Contact
            </Link>
            <a
              href="https://www.instagram.com/briilovesnailz"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-gray-700 hover:text-gray-900 transition-all flex items-center gap-2 text-lg pb-1 px-3 border-b-2 border-transparent hover:border-gray-800"
            >
              <Instagram size={20} />
              Follow Me
            </a>
          </nav>

          <Link to="/cart" className="relative">
            <div className="p-2 rounded-lg hover:bg-[#FFC9D7] transition-colors">
              <ShoppingCart className="text-[#FF8CAA]" size={22} />
              {itemCount > 0 && (
                <Badge className="absolute -top-1 -right-1 bg-[#FFBCCD] text-white border-0 min-w-[20px] h-5 flex items-center justify-center text-xs font-semibold">
                  {itemCount}
                </Badge>
              )}
            </div>
          </Link>
        </div>

        {/* Mobile Navigation */}
        <nav className="md:hidden flex justify-around mt-4 pt-4 border-t border-[#FFC9D7]">
          <Link
            to="/"
            className={`text-sm font-medium text-gray-700 pb-1 ${
              isActive('/') ? 'border-b-2 border-gray-800' : 'border-b-2 border-transparent'
            }`}
          >
            Home
          </Link>
          <Link
            to="/services"
            className={`text-sm font-medium text-gray-700 pb-1 ${
              isActive('/services') ? 'border-b-2 border-gray-800' : 'border-b-2 border-transparent'
            }`}
          >
            Services
          </Link>
          <Link
            to="/contact"
            className={`text-sm font-medium text-gray-700 pb-1 ${
              isActive('/contact') ? 'border-b-2 border-gray-800' : 'border-b-2 border-transparent'
            }`}
          >
            Contact
          </Link>
          <a
            href="https://www.instagram.com/briilovesnailz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-gray-700 flex items-center gap-1 pb-1 border-b-2 border-transparent"
          >
            <Instagram size={14} />
            Follow
          </a>
        </nav>
      </div>
    </header>
    {/* Thick Black Border Line */}
    <div className="sticky top-[88px] z-40 border-t-4 border-gray-800 w-full"></div>
    </>
  );
};

export default Header;
