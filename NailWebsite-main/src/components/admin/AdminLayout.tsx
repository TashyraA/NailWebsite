import React, { useState } from 'react';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { isAuthenticated, logout } from '@/services/authService';
import { 
  LayoutDashboard, 
  Scissors, 
  Calendar, 
  Clock,
  Settings,
  LogOut,
  Sparkles,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!isAuthenticated()) {
    return <Navigate to="/admin/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/services', icon: Scissors, label: 'Services' },
    { path: '/admin/appointments', icon: Calendar, label: 'Appointments' },
    { path: '/admin/schedule', icon: Clock, label: 'Schedule' },
    { path: '/admin/time-slots', icon: Settings, label: 'Time Slots' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-pink-200 to-pink-300 text-gray-800 p-4 flex items-center justify-between shadow-lg">
        <Link to="/" className="flex items-center gap-3">
          <img 
            src="/logo.png" 
            alt="InLoveNailz Logo" 
            className="h-8 w-auto object-contain"
          />
        </Link>
        <Button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          variant="ghost"
          size="sm"
          className="text-gray-800 hover:bg-pink-400/50"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </Button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="fixed top-16 left-0 right-0 bg-gradient-to-b from-pink-200 to-pink-300 text-gray-800 max-h-[calc(100vh-4rem)] overflow-y-auto shadow-lg">
            <nav className="p-4">
              <ul className="space-y-2">
                {navItems.map(item => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                        isActive(item.path)
                          ? 'bg-gradient-to-r from-pink-500 to-pink-700 text-white shadow-lg'
                          : 'text-gray-700 hover:bg-pink-400/50'
                      }`}
                    >
                      <item.icon size={20} />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-4 border-t border-pink-400">
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  className="w-full justify-start text-gray-700 hover:text-gray-900 hover:bg-pink-400/50"
                >
                  <LogOut size={20} className="mr-3" />
                  Logout
                </Button>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 bg-gradient-to-b from-pink-200 to-pink-300 text-gray-800 fixed h-full shadow-lg">
        <div className="p-6 border-b border-pink-400">
          <Link to="/" className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="InLoveNailz Logo" 
              className="h-10 w-auto object-contain"
            />
          </Link>
        </div>

        <nav className="p-4">
          <ul className="space-y-2">
            {navItems.map(item => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive(item.path)
                      ? 'bg-gradient-to-r from-pink-500 to-pink-700 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-pink-400/50'
                  }`}
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-pink-400">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start text-gray-700 hover:text-gray-900 hover:bg-pink-400/50"
          >
            <LogOut size={20} className="mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pt-20 lg:pt-8 p-4 lg:p-8">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
