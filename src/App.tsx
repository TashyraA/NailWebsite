
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Routes,
  Route,
  BrowserRouter,
  Outlet,
} from "react-router-dom";

import { CartProvider } from "@/contexts/CartContext";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

import Home from "@/pages/Home";
import Services from "@/pages/Services";
import Cart from "@/pages/Cart";
import BookingConfirmation from "@/pages/BookingConfirmation";
import PaymentSuccess from "@/pages/PaymentSuccess";
import Contact from "@/pages/Contact";
import BookAppointment from "@/pages/BookAppointment";
import Policies from "@/pages/Policies";

import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminServices from "@/pages/admin/AdminServices";
import AdminAppointments from "@/pages/admin/AdminAppointments";
import AdminSchedule from "@/pages/admin/AdminSchedule";
import AdminTimeSlots from "@/pages/admin/AdminTimeSlots";

import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      retry: 1,
      retryDelay: attemptIndex =>
        Math.min(1000 * 2 ** attemptIndex, 5000),
    },
  },
});

/*
  PUBLIC WEBSITE LAYOUT

  All public pages share:
  - Header
  - Page content
  - Footer

  Admin pages remain separate.
*/
function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <div className="flex-1">
        <Outlet />
      </div>

      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CartProvider>
          <BrowserRouter>
            <Toaster />
            <Sonner />

            <Routes>
              {/* PUBLIC ROUTES */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/services" element={<Services />} />
                <Route path="/cart" element={<Cart />} />

                <Route
                  path="/checkout"
                  element={<BookAppointment />}
                />

                <Route
                  path="/book"
                  element={<BookAppointment />}
                />

                <Route
                  path="/booking-confirmation"
                  element={<BookingConfirmation />}
                />

                <Route
                  path="/payment-success"
                  element={<PaymentSuccess />}
                />

                <Route path="/contact" element={<Contact />} />
                <Route path="/policies" element={<Policies />} />
              </Route>

              {/* ADMIN ROUTES */}
              <Route
                path="/admin/login"
                element={<AdminLogin />}
              />

              <Route
                path="/admin"
                element={<AdminDashboard />}
              />

              <Route
                path="/admin/services"
                element={<AdminServices />}
              />

              <Route
                path="/admin/appointments"
                element={<AdminAppointments />}
              />

              <Route
                path="/admin/schedule"
                element={<AdminSchedule />}
              />

              <Route
                path="/admin/time-slots"
                element={<AdminTimeSlots />}
              />

              {/* PAGE NOT FOUND */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
