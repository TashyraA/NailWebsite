
import React, { useEffect, useState } from 'react';

import {
  Navigate,
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import {
  isAuthenticated,
  logout,
} from '@/services/authService';

import {
  LayoutDashboard,
  Scissors,
  CalendarDays,
  Clock3,
  Settings2,
  LogOut,
  Menu,
  X,
  Loader2,
  ArrowUpRight,
  ChevronRight,
  Heart,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface AdminLayoutProps {
  children: React.ReactNode;
}

type AuthenticationStatus =
  | 'checking'
  | 'authenticated'
  | 'unauthenticated';

const navigationItems = [
  {
    path: '/admin',
    icon: LayoutDashboard,
    label: 'Overview',
    description: 'Dashboard',
  },
  {
    path: '/admin/appointments',
    icon: CalendarDays,
    label: 'Appointments',
    description: 'Manage bookings',
  },
  {
    path: '/admin/services',
    icon: Scissors,
    label: 'Services',
    description: 'Nail menu',
  },
  {
    path: '/admin/schedule',
    icon: Clock3,
    label: 'Schedule',
    description: 'Availability',
  },
  {
    path: '/admin/time-slots',
    icon: Settings2,
    label: 'Time Slots',
    description: 'Booking settings',
  },
];

const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [isMobileMenuOpen, setIsMobileMenuOpen] =
    useState(false);

  const [authStatus, setAuthStatus] =
    useState<AuthenticationStatus>('checking');

  const [isLoggingOut, setIsLoggingOut] =
    useState(false);

  useEffect(() => {
    let active = true;

    const verifyAuthentication = async () => {
      setAuthStatus('checking');

      try {
        const authenticated = await isAuthenticated();

        if (!active) return;

        setAuthStatus(
          authenticated
            ? 'authenticated'
            : 'unauthenticated'
        );
      } catch (error) {
        console.error(
          'Admin authentication verification failed:',
          error
        );

        if (active) {
          setAuthStatus('unauthenticated');
        }
      }
    };

    void verifyAuthentication();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      const success = await logout();

      if (success) {
        localStorage.removeItem(
          'isAdminAuthenticated'
        );

        setAuthStatus('unauthenticated');

        navigate('/admin/login', {
          replace: true,
        });
      } else {
        toast({
          title: 'Logout failed',
          description:
            'Unable to sign out. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Admin logout failed:', error);

      toast({
        title: 'Logout failed',
        description:
          'Unable to sign out. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }

    return (
      location.pathname === path ||
      location.pathname.startsWith(`${path}/`)
    );
  };

  const renderNavigation = (mobile = false) => (
    <nav
      aria-label={
        mobile
          ? 'Mobile admin navigation'
          : 'Admin navigation'
      }
      className="space-y-1.5"
    >
      {navigationItems.map(item => {
        const active = isActive(item.path);

        return (
          <Link
            key={item.path}
            to={item.path}
            aria-current={active ? 'page' : undefined}
            onClick={() => {
              if (mobile) {
                setIsMobileMenuOpen(false);
              }
            }}
            className={`
              group flex items-center gap-3
              rounded-xl px-3.5 py-3
              transition-all duration-200
              ${
                active
                  ? 'bg-[#963F60] text-white shadow-[0_5px_15px_rgba(150,63,96,0.16)]'
                  : 'text-[#61545B] hover:bg-[#F7DDE4]/65 hover:text-[#963F60]'
              }
            `}
          >
            <span
              className={`
                flex h-10 w-10 shrink-0
                items-center justify-center
                rounded-lg transition-colors
                ${
                  active
                    ? 'bg-white/15 text-white'
                    : 'bg-[#FFF7F8] text-[#963F60] group-hover:bg-white'
                }
              `}
            >
              <item.icon size={19} strokeWidth={1.8} />
            </span>

            <span className="flex-1 min-w-0">
              <span className="block text-[13px] font-semibold leading-tight">
                {item.label}
              </span>

              <span
                className={`
                  block mt-1 text-[11px] leading-tight
                  ${
                    active
                      ? 'text-white/75'
                      : 'text-[#96858E]'
                  }
                `}
              >
                {item.description}
              </span>
            </span>

            {active && (
              <ChevronRight
                size={16}
                className="text-white/75"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );

  const renderLogoutButton = () => (
    <Button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      variant="ghost"
      className="
        w-full h-11 justify-start gap-3
        rounded-xl px-3.5
        text-[#61545B]
        hover:bg-[#F7DDE4]/70
        hover:text-[#963F60]
      "
    >
      {isLoggingOut ? (
        <Loader2
          size={18}
          className="animate-spin"
        />
      ) : (
        <LogOut size={18} strokeWidth={1.8} />
      )}

      <span className="text-[13px] font-semibold">
        {isLoggingOut
          ? 'Signing out...'
          : 'Sign Out'}
      </span>
    </Button>
  );

  if (authStatus === 'checking') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FFF7F8] px-4">
        <div className="w-full max-w-sm rounded-2xl border border-[#F0DCE3] bg-white px-8 py-10 text-center shadow-[0_12px_40px_rgba(41,37,43,0.05)]">
          <img
            src="/logo.png"
            alt="InLoveNailz Logo"
            className="h-20 w-auto object-contain mx-auto mb-6"
          />

          <Loader2
            size={30}
            className="animate-spin text-[#963F60] mx-auto mb-4"
          />

          <h1 className="font-heading text-3xl text-[#29252B] mb-2">
            Welcome Back
          </h1>

          <p className="text-sm text-[#786A72]">
            Verifying administrator access...
          </p>
        </div>
      </div>
    );
  }

  if (authStatus === 'unauthenticated') {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: location }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF7F8] text-[#29252B]">
      {/* =====================================
          DESKTOP SIDEBAR
      ===================================== */}

      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-[272px] flex-col border-r border-[#F0DCE3] bg-white">
        {/* Branding */}
        <div className="px-6 pt-8 pb-6 border-b border-[#F5E8EC]">
          <Link
            to="/"
            className="flex flex-col items-center text-center"
          >
            <img
              src="/logo.png"
              alt="InLoveNailz Logo"
              className="h-20 w-auto max-w-full object-contain"
            />

            <span className="mt-3 text-[10px] uppercase tracking-[0.28em] font-semibold text-[#963F60]">
              Studio Management
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-7">
          <p className="px-3.5 mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#A28F98]">
            Workspace
          </p>

          {renderNavigation()}

          {/* Brand Message */}
          <div className="mt-9 rounded-2xl border border-[#F1DDE4] bg-[#FFF7F8] p-5">
            <Heart
              size={20}
              strokeWidth={1.5}
              className="text-[#963F60] mb-3"
            />

            <p className="font-heading text-[25px] leading-tight text-[#29252B]">
              Beautiful nails.
              <br />
              <span className="italic text-[#963F60]">
                Thoughtful care.
              </span>
            </p>

            <p className="mt-3 text-xs leading-relaxed text-[#786A72]">
              Your space to manage the details
              behind every appointment.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-5 border-t border-[#F5E8EC]">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl px-3.5 py-3 text-[#963F60] hover:bg-[#FFF7F8]"
          >
            <span className="text-[13px] font-semibold">
              View Website
            </span>

            <ArrowUpRight size={17} />
          </a>

          {renderLogoutButton()}

          <p className="mt-5 text-center text-[10px] tracking-[0.08em] text-[#A28F98]">
            INLOVENAILZ · ADMIN STUDIO
          </p>
        </div>
      </aside>

      {/* =====================================
          MOBILE HEADER
      ===================================== */}

      <header className="lg:hidden fixed inset-x-0 top-0 z-50 flex h-[72px] items-center justify-between border-b border-[#F0DCE3] bg-white/95 px-5 shadow-sm backdrop-blur-md">
        <Link
          to="/admin"
          className="flex items-center gap-3"
        >
          <img
            src="/logo.png"
            alt="InLoveNailz Logo"
            className="h-11 w-auto object-contain"
          />

          <span className="hidden sm:block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#963F60]">
            Admin Studio
          </span>
        </Link>

        <button
          type="button"
          aria-label={
            isMobileMenuOpen
              ? 'Close navigation menu'
              : 'Open navigation menu'
          }
          aria-expanded={isMobileMenuOpen}
          onClick={() =>
            setIsMobileMenuOpen(previous => !previous)
          }
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#F0DCE3] bg-[#FFF7F8] text-[#963F60] transition-colors hover:bg-[#F7DDE4]"
        >
          {isMobileMenuOpen ? (
            <X size={22} />
          ) : (
            <Menu size={22} />
          )}
        </button>
      </header>

      {/* =====================================
          MOBILE NAVIGATION
      ===================================== */}

      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[45]">
          <button
            type="button"
            aria-label="Close navigation overlay"
            className="absolute inset-0 bg-[#29252B]/40"
            onClick={() =>
              setIsMobileMenuOpen(false)
            }
          />

          <div className="absolute top-[72px] left-0 right-0 max-h-[calc(100dvh-72px)] overflow-y-auto border-b border-[#F0DCE3] bg-white px-5 py-6 shadow-xl">
            <p className="mb-4 px-3.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#A28F98]">
              Workspace
            </p>

            {renderNavigation(true)}

            <div className="mt-5 border-t border-[#F5E8EC] pt-4">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-xl px-3.5 py-3 text-[#963F60] hover:bg-[#FFF7F8]"
              >
                <span className="text-[13px] font-semibold">
                  View Website
                </span>

                <ArrowUpRight size={17} />
              </a>

              {renderLogoutButton()}
            </div>
          </div>
        </div>
      )}

      {/* =====================================
          MAIN CONTENT
      ===================================== */}

      <div className="lg:ml-[272px] min-h-screen">
        {/* Desktop Top Bar */}
        <div className="hidden lg:flex h-[76px] items-center justify-end border-b border-[#F0DCE3] bg-white/80 px-8 xl:px-10">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F7DDE4] text-[#963F60]">
              <Heart size={17} strokeWidth={1.7} />
            </span>

            <div className="text-right">
              <p className="text-[12px] font-semibold text-[#29252B]">
                Administrator
              </p>

              <p className="text-[11px] text-[#96858E]">
                Studio Workspace
              </p>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="px-4 pb-10 pt-[96px] sm:px-6 lg:px-8 lg:pt-8 xl:px-10">
          <div className="mx-auto w-full max-w-[1500px]">
            {children}
          </div>
        </main>

        {/* Page Footer */}
        <footer className="px-4 pb-8 sm:px-6 lg:px-8 xl:px-10">
          <div className="mx-auto max-w-[1500px] border-t border-[#F0DCE3] pt-5 text-[11px] text-[#A28F98]">
            © {new Date().getFullYear()} InLoveNailz by Briana
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AdminLayout;
