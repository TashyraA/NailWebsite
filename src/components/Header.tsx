
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Instagram, Menu, X } from 'lucide-react';

import { useCart } from '@/contexts/CartContext';
import { Badge } from '@/components/ui/badge';

/* =========================================
   INLOVENAILZ NAVIGATION
========================================= */

const navItems = [
  { label: 'Home', path: '/' },
  { label: 'Services', path: '/services' },
  { label: 'Contact', path: '/contact' },
] as const;

const Header = () => {
  const location = useLocation();
  const { getItemCount } = useCart();
  const itemCount = getItemCount();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileNavRef = useRef<HTMLElement>(null);

  const isActive = (path: string, label: string) => {
    if (path === '/') {
      return label === 'Home' && location.pathname === '/';
    }

    return (
      location.pathname === path ||
      location.pathname.startsWith(`${path}/`)
    );
  };

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  useEffect(() => {
    if (menuOpen) {
      mobileNavRef.current
        ?.querySelector<HTMLAnchorElement>('a')
        ?.focus();
    }
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header
      className="
        sticky top-0 z-50 w-full
        border-b border-[#F7DDE4]
        bg-[#FFF7F8]/95
        shadow-[0_2px_18px_rgba(150,63,96,0.035)]
        backdrop-blur-xl
      "
    >
      <div
        className="
          mx-auto flex h-[78px] w-full max-w-[1440px]
          items-center justify-between gap-4 px-4
          sm:px-6 lg:px-8
        "
      >
        {/* =====================================
            LOGO
        ===================================== */}

        <Link
          to="/"
          className="
            relative z-10 flex shrink-0 items-center
            transition-opacity duration-200 hover:opacity-85
          "
          aria-label="InLoveNailz home"
          onClick={closeMenu}
        >
          <img
            src="/logo.png"
            alt="InLoveNailz by Briana"
            className="
              block h-auto max-h-[64px] w-[145px] object-contain
              sm:w-[165px] xl:w-[185px]
            "
          />
        </Link>

        {/* =====================================
            DESKTOP NAVIGATION AND ACTIONS
        ===================================== */}

        <div className="ml-auto flex shrink-0 items-center gap-3 lg:gap-5">
          <nav
            className="hidden items-center justify-end gap-5 lg:flex xl:gap-7"
            aria-label="Main navigation"
          >
            {navItems.map(({ label, path }) => {
              const active = isActive(path, label);

              return (
                <Link
                  key={label}
                  to={path}
                  aria-current={active ? 'page' : undefined}
                  className={`
                    group relative whitespace-nowrap py-2 text-[13px]
                    font-medium tracking-[0.02em] transition-colors duration-200
                    ${
                      active
                        ? 'text-[#963F60]'
                        : 'text-[#29252B] hover:text-[#963F60]'
                    }
                  `}
                >
                  {label}

                  <span
                    aria-hidden="true"
                    className={`
                      absolute bottom-[3px] left-0 h-[1.5px]
                      bg-[#963F60] transition-all duration-300
                      ${active ? 'w-full' : 'w-0 group-hover:w-full'}
                    `}
                  />
                </Link>
              );
            })}
          </nav>

          {/* =====================================
              INSTAGRAM
          ===================================== */}

          <a
            href="https://www.instagram.com/briilovesnailz"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit InLoveNailz on Instagram"
            className="
              hidden h-10 w-10 items-center justify-center rounded-full
              text-[#963F60] transition-colors duration-200
              hover:bg-[#F7DDE4] sm:inline-flex
            "
          >
            <Instagram
              size={19}
              strokeWidth={1.7}
              aria-hidden="true"
            />
          </a>

          {/* =====================================
              SHOPPING BAG
          ===================================== */}

          <Link
            to="/cart"
            className="
              relative inline-flex h-10 w-10 items-center justify-center
              rounded-full text-[#963F60] transition-colors duration-200
              hover:bg-[#F7DDE4]
            "
            aria-label={`View booking bag, ${itemCount} selected services`}
            onClick={closeMenu}
          >
            <ShoppingBag
              size={22}
              strokeWidth={1.7}
              aria-hidden="true"
            />

            {itemCount > 0 && (
              <Badge
                className="
                  absolute -right-1 -top-1 flex h-[19px] min-w-[19px]
                  items-center justify-center rounded-full border-0
                  bg-[#963F60] px-1 text-[10px] font-semibold
                  text-white shadow-none
                "
              >
                {itemCount}
              </Badge>
            )}
          </Link>

          {/* =====================================
              MOBILE MENU BUTTON
          ===================================== */}

          <button
            ref={menuButtonRef}
            type="button"
            aria-label={
              menuOpen
                ? 'Close navigation menu'
                : 'Open navigation menu'
            }
            aria-expanded={menuOpen}
            aria-controls="inl-mobile-navigation"
            onClick={() => setMenuOpen(previous => !previous)}
            className="
              inline-flex h-10 w-10 items-center justify-center rounded-full
              text-[#963F60] transition-colors duration-200
              hover:bg-[#F7DDE4] lg:hidden
            "
          >
            {menuOpen ? (
              <X
                size={23}
                strokeWidth={1.7}
                aria-hidden="true"
              />
            ) : (
              <Menu
                size={23}
                strokeWidth={1.7}
                aria-hidden="true"
              />
            )}
          </button>
        </div>
      </div>

      {/* =====================================
          MOBILE NAVIGATION
      ===================================== */}

      <nav
        ref={mobileNavRef}
        id="inl-mobile-navigation"
        aria-label="Mobile navigation"
        aria-hidden={!menuOpen}
        className={`
          absolute left-0 right-0 top-full overflow-hidden
          border-b border-[#F7DDE4] bg-[#FFF7F8]
          shadow-[0_16px_25px_rgba(41,37,43,0.07)]
          transition-all duration-300 lg:hidden
          ${
            menuOpen
              ? 'visible max-h-[85vh] opacity-100'
              : 'invisible max-h-0 border-b-0 opacity-0'
          }
        `}
      >
        <div
          className="
            mx-auto flex max-h-[85vh] max-w-[1440px]
            flex-col gap-1 overflow-y-auto px-6 pb-7 pt-5
          "
        >
          {navItems.map(({ label, path }) => {
            const active = isActive(path, label);

            return (
              <Link
                key={label}
                to={path}
                onClick={closeMenu}
                tabIndex={menuOpen ? 0 : -1}
                aria-current={active ? 'page' : undefined}
                className={`
                  border-b border-[#F7DDE4]/70 py-3 text-[14px]
                  font-medium transition-colors duration-200
                  ${
                    active
                      ? 'text-[#963F60]'
                      : 'text-[#29252B] hover:text-[#963F60]'
                  }
                `}
              >
                {label}
              </Link>
            );
          })}

          {/* =====================================
              MOBILE INSTAGRAM
          ===================================== */}

          <a
            href="https://www.instagram.com/briilovesnailz"
            target="_blank"
            rel="noopener noreferrer"
            onClick={closeMenu}
            tabIndex={menuOpen ? 0 : -1}
            className="
              mt-3 flex items-center justify-center gap-2 py-2
              text-[13px] font-medium text-[#963F60]
            "
          >
            <Instagram size={17} aria-hidden="true" />
            Follow on Instagram
          </a>
        </div>
      </nav>
    </header>
  );
};

export default Header;
