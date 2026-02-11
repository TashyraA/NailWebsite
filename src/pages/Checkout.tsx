import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Textarea } from '@/components/ui/textarea';
import { useCart } from '@/contexts/CartContext';
import { Clock, Calendar as CalendarIcon, User, Mail, Phone, CreditCard, Loader2 } from 'lucide-react';
import { formatDate, formatTime12Hour, formatDateForInput } from '@/utils/dateTime';
import { createAppointment, getBlockedDates, getBlockedTimes, getBookedSlotsForDate, getAvailableTimeSlots } from '@/services/appointmentService';
import { stripePromise } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';
import PaymentForm from '@/components/PaymentForm';

const Checkout = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { items, getTotalPrice, getTotalDeposit, clearCart, refreshCartItems } = useCart();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Refresh cart items when component mounts to ensure latest prices
  useEffect(() => {
    console.log('Checkout mounted, refreshing cart items');
    refreshCartItems();
  }, []);

  const { data: blockedDates = [] } = useQuery<any[]>({
    queryKey: ['blockedDates'],
    queryFn: getBlockedDates,
  });

  const { data: blockedTimes = [] } = useQuery<any[]>({
    queryKey: ['blockedTimes'],
    queryFn: getBlockedTimes,
  });

  // Fetch available time slots from database
  const { data: availableTimeSlots = [] } = useQuery<string[]>({
    queryKey: ['availableTimeSlots'],
    queryFn: getAvailableTimeSlots,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

  // Fetch booked slots for selected date
  const { data: bookedSlots = [] } = useQuery<string[]>({
    queryKey: ['bookedSlots', selectedDate?.toISOString().split('T')[0]],
    queryFn: () => getBookedSlotsForDate(selectedDate!.toISOString().split('T')[0]),
    enabled: !!selectedDate,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes (formerly cacheTime)
    refetchOnWindowFocus: false,
  });

  // Simplified logging to prevent excessive console output
  React.useEffect(() => {
    if (selectedDate && Array.isArray(bookedSlots) && bookedSlots.length > 0) {
      console.log('Booked slots for', selectedDate.toISOString().split('T')[0], ':', bookedSlots);
    }
  }, [selectedDate, bookedSlots]);

  const totalPrice = getTotalPrice();
  const depositAmount = getTotalDeposit();

  // Memoize computed values to prevent infinite re-renders
  const allAvailableTimes = React.useMemo(() => {
    return Array.isArray(availableTimeSlots) && availableTimeSlots.length > 0 ? availableTimeSlots : [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
      '15:00', '15:30', '16:00', '16:30', '17:00'
    ];
  }, [availableTimeSlots]);

  // Memoize filtered times to prevent infinite loops
  const blockedTimeStrings = React.useMemo(() => {
    return Array.isArray(blockedTimes) ? blockedTimes.map((t: any) => t.time) : [];
  }, [blockedTimes]);
  
  const availableTimes = React.useMemo(() => {
    if (!Array.isArray(allAvailableTimes)) return [];
    return allAvailableTimes.filter(
      time => !Array.isArray(bookedSlots) || (!bookedSlots.includes(time) && !blockedTimeStrings.includes(time))
    );
  }, [allAvailableTimes, bookedSlots, blockedTimeStrings]);

  const isTimeBlocked = (time: string): boolean => {
    if (!blockedTimes || blockedTimes.length === 0) return false;
    
    // Check if this specific time is blocked
    const isBlocked = blockedTimes.some(blocked => {
      // If the blocked time has a specific date, only block for that date
      if (blocked.date && selectedDate) {
        const selectedDateStr = formatDateForInput(selectedDate);
        return blocked.time === time && blocked.date === selectedDateStr;
      }
      // Otherwise, block this time for all dates
      return blocked.time === time;
    });
    
    console.log('Checking if time is blocked:', time, 'Result:', isBlocked);
    return isBlocked;
  };

  const availableTimesFiltered = availableTimes.filter(time => !isTimeBlocked(time));

  const isDateBlocked = (date: Date) => {
    const dateStr = formatDateForInput(date);
    const isBlocked = blockedDates?.some(blocked => blocked.date === dateStr) || false;
    console.log('Checking if date is blocked:', dateStr, 'Result:', isBlocked);
    return isBlocked;
  };

  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedTime) {
      toast({
        title: 'Missing Information',
        description: 'Please select both date and time for your appointment',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.name || !formData.email || !formData.phone) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setIsProcessing(true);

    try {
      console.log('Creating payment intent...');
      console.log('Deposit amount:', depositAmount);

      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          amount: depositAmount,
          customerEmail: formData.email,
          customerName: formData.name,
          appointmentData: {
            appointmentDate: selectedDate.toISOString().split('T')[0],
            appointmentTime: selectedTime,
            services: items,
            totalPrice: totalPrice,
          }
        }
      });

      console.log('Full response - data:', data, 'error:', error);

      if (error) {
        console.error('Payment intent error:', error);
        console.error('Error context:', error.context);
        // Try to get more details from the error
        let errorDetails = null;
        if (error.context?.body) {
          if (typeof error.context.body === 'string') {
            errorDetails = error.context.body;
          } else if (typeof error.context.body === 'object') {
            errorDetails = JSON.stringify(error.context.body);
          }
        }
        console.error('Error details:', errorDetails);
        throw new Error(errorDetails || error.message || 'Failed to create payment intent');
      }

      if (!data) {
        throw new Error('No response from payment service');
      }

      // Check if data contains an error from Stripe
      if (data.error) {
        console.error('Stripe error in response:', data.error);
        throw new Error(data.error);
      }

      console.log('Payment intent response:', data);

      if (!data.clientSecret) {
        throw new Error('Payment service did not return a client secret');
      }

      setClientSecret(data.clientSecret);
      setShowPaymentModal(true);
    } catch (error: any) {
      console.error('Payment setup error:', error);
      toast({
        title: 'Payment Setup Failed',
        description: error.message || 'Unable to initialize payment. Please ensure your Stripe keys are configured correctly.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = async () => {
    setIsProcessing(true);
    
    try {
      const appointmentData = {
        customerName: formData.name,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        appointmentDate: selectedDate!.toISOString().split('T')[0],
        appointmentTime: selectedTime,
        services: items,
        totalPrice: totalPrice,
        depositPaid: depositAmount,
        balanceDue: totalPrice - depositAmount
      };

      console.log('Payment successful, creating appointment:', appointmentData);

      const appointment = await createAppointment(appointmentData);

      console.log('Appointment created:', appointment);

      // Show success toast with email confirmation
      toast({
        title: '🎉 Appointment Booked Successfully!',
        description: `A confirmation email has been sent to ${formData.email}`,
      });

      clearCart();
      
      navigate('/booking-confirmation', {
        state: {
          appointment: {
            id: appointment.id,
            customerName: formData.name,
            customerEmail: formData.email,
            customerPhone: formData.phone,
            appointmentDate: selectedDate!.toISOString().split('T')[0],
            appointmentTime: selectedTime,
            services: items,
            totalPrice: totalPrice,
            status: 'pending'
          },
          depositPaid: depositAmount,
          balanceDue: totalPrice - depositAmount,
          emailSent: true
        }
      });
    } catch (error) {
      console.error('Booking error:', error);
      toast({
        title: 'Booking Failed',
        description: 'Payment succeeded but booking failed. Please contact us.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFE9EF] via-[#FFC9D7] to-[#FFBCCD]">
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8 text-gray-800">
          Complete Your Booking
        </h1>

        <form onSubmit={handleProceedToPayment}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Forms */}
            <div className="lg:col-span-2 space-y-6">
              {/* Contact Information */}
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4 text-gray-800">Contact Information</h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Jane Smith"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="jane@example.com"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Special Requests (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={e => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Any preferences or special requests?"
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                </div>
              </Card>

              {/* Date & Time Selection */}
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                  <CalendarIcon size={20} className="text-pink-500" />
                  Select Date & Time
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="mb-2 block">Choose Date *</Label>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => 
                        date < new Date() || isDateBlocked(date)
                      }
                      className="rounded-lg border shadow-sm"
                    />
                  </div>

                  <div>
                    <Label className="mb-2 flex items-center gap-2">
                      <Clock size={16} />
                      Choose Time *
                    </Label>
                    <div className="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                      {availableTimesFiltered.length === 0 ? (
                        <div className="col-span-3 text-center py-8 text-gray-500">
                          No available times for this date
                        </div>
                      ) : (
                        availableTimesFiltered.map(time => (
                          <button
                            key={time}
                            type="button"
                            onClick={() => setSelectedTime(time)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedTime === time
                            ? 'bg-[#FF8CAA] text-white font-semibold shadow-md'
                            : 'bg-[#FFE9EF] text-gray-700 hover:bg-[#FFC9D7]'
                            }`}
                          >
                            {formatTime12Hour(time)}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {selectedDate && selectedTime && (
                  <div className="mt-4 p-4 bg-[#FFE9EF] rounded-lg">
                    <p className="text-sm font-medium text-gray-800">
                      Selected: {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} at {formatTime12Hour(selectedTime)}
                    </p>
                  </div>
                )}
              </Card>

              {/* Payment Notice */}
              <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                  <CreditCard size={20} className="text-pink-500" />
                  Secure Payment
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <p className="text-sm text-gray-700">
                      <strong>Deposit Required:</strong> ${depositAmount.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <p className="text-sm text-gray-700">
                      <strong>Balance Due at Appointment:</strong> ${(totalPrice - depositAmount).toFixed(2)}
                    </p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-purple-200">
                    <p className="text-xs text-gray-600 flex items-center gap-2">
                      🔒 Payment processed securely through Stripe
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-24">
                <h2 className="text-xl font-bold mb-4 text-gray-800">Order Summary</h2>
                
                <div className="space-y-3 mb-6">
                  {items.map(item => (
                    <div key={item.service.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {item.service.title} x{item.quantity}
                      </span>
                      <span className="font-medium">
                        ${(item.service.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">${totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#FF8CAA] font-semibold text-lg">
                    <span>Deposit (Pay Now)</span>
                    <span>${depositAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Due at Appointment</span>
                    <span>${(totalPrice - depositAmount).toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isProcessing || !selectedDate || !selectedTime}
                  className="w-full bg-[#FF8CAA] hover:bg-[#FF6B96] text-white font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard size={20} />
                      Proceed to Payment
                    </>
                  )}
                </Button>

                <p className="text-xs text-gray-500 text-center mt-4">
                  By completing this booking, you agree to our terms and cancellation policy.
                </p>
              </Card>
            </div>
          </div>
        </form>

        {/* Payment Modal */}
        {showPaymentModal && clientSecret && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Complete Payment</h2>
                  <Button
                    variant="ghost"
                    onClick={() => !isProcessing && setShowPaymentModal(false)}
                    disabled={isProcessing}
                    className="hover:bg-gray-100"
                  >
                    ✕
                  </Button>
                </div>

                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: 'stripe',
                      variables: {
                        colorPrimary: '#FF8CAA',
                        borderRadius: '8px',
                      }
                    }
                  }}
                >
                  <PaymentForm
                    onSuccess={handlePaymentSuccess}
                    amount={depositAmount}
                  />
                </Elements>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Checkout;
