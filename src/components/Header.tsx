import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Instagram, Menu } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { Badge } from '@/components/ui/badge';

const Header = () => {
  const location = useLocation();
  const { getItemCount } = useCart();
  const itemCount = getItemCount();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    ['Home', '/'],
    ['Services', '/services'],
    ['Gallery', '/'],
    ['About', '/'],
    ['Policies', '/'],
    ['Contact', '/contact'],
  ] as const;

  return (
    <header className="sticky top-0 z-50 h-[72px] border-b border-[#F7DDE4] bg-[#FFF7F8] shadow-sm">
      <div className="mx-auto flex h-full max-w-[1180px] items-center justify-between px-4 md:px-6">
        <Link to="/" className="shrink-0" aria-label="InLoveNailz home">
          <img src="/logo.png" alt="InLoveNailz by Briana" className="h-[62px] w-auto object-contain" />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {navItems.map(([label, path]) => (
            <Link key={label} to={path} className={`border-b pb-1 text-[13px] transition-colors ${isActive(path) ? 'border-[#963F60] text-[#963F60]' : 'border-transparent text-[#29252B] hover:border-[#963F60] hover:text-[#963F60]'}`}>
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 md:gap-4">
          <a href="https://www.instagram.com/briilovesnailz" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hidden rounded-md p-2 text-[#963F60] hover:bg-[#F7DDE4] sm:block">
            <Instagram size={20} />
          </a>
          <Link to="/cart" className="relative rounded-md p-2 text-[#963F60] hover:bg-[#F7DDE4]" aria-label="Shopping cart">
            <ShoppingCart size={21} />
            {itemCount > 0 && <Badge className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center border-0 bg-[#963F60] px-1 text-[10px] text-white">{itemCount}</Badge>}
          </Link>
          <button type="button" className="rounded-md p-2 text-[#29252B] lg:hidden" aria-label="Open navigation"><Menu size={22} /></button>
        </div>
      </div>
    </header>
  );
};

export default Header;
