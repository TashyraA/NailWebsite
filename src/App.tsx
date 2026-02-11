import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, BrowserRouter } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import BackgroundMusic from "@/components/BackgroundMusic";
import Header from "@/components/Header";
import Home from "@/pages/Home";
import Services from "@/pages/Services";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import BookingConfirmation from "@/pages/BookingConfirmation";
import PaymentSuccess from "@/pages/PaymentSuccess";
import Contact from "@/pages/Contact";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminServices from "@/pages/admin/AdminServices";
import AdminAppointments from "@/pages/admin/AdminAppointments";
import AdminSchedule from "@/pages/admin/AdminSchedule";
import AdminTimeSlots from "@/pages/admin/AdminTimeSlots";
import NotFound from "@/pages/NotFound";
import DatabaseTest from "@/pages/DatabaseTest";
import EmailTest from "@/pages/EmailTest";
import SimpleEmailTest from "@/pages/SimpleEmailTest";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      retry: 1,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000),
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CartProvider>
          <BrowserRouter>
            <Toaster />
            <Sonner />
            <BackgroundMusic />
            <Routes>
              {/* Public Routes with Header only (no Footer) */}
              <Route path="/" element={<><Header /><Home /></>} />
              <Route path="/services" element={<><Header /><Services /></>} />
              <Route path="/cart" element={<><Header /><Cart /></>} />
              <Route path="/checkout" element={<><Header /><Checkout /></>} />
              <Route path="/booking-confirmation" element={<><Header /><BookingConfirmation /></>} />
              <Route path="/payment-success" element={<><Header /><PaymentSuccess /></>} />
              <Route path="/contact" element={<><Header /><Contact /></>} />
              
              {/* Debug Routes - Remove in production */}
              {process.env.NODE_ENV === 'development' && (
                <>
                  <Route path="/debug/database" element={<><Header /><DatabaseTest /></>} />
                  <Route path="/debug/email" element={<><Header /><EmailTest /></>} />
                  <Route path="/debug/simple-email" element={<><Header /><SimpleEmailTest /></>} />
                </>
              )}
              
              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/services" element={<AdminServices />} />
              <Route path="/admin/appointments" element={<AdminAppointments />} />
              <Route path="/admin/schedule" element={<AdminSchedule />} />
              <Route path="/admin/time-slots" element={<AdminTimeSlots />} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
