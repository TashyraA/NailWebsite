import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { CheckCircle, Calendar, Clock, Mail, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDate, formatTime12Hour } from '@/utils/dateTime';

const BookingConfirmation = () => {
  const location = useLocation();
  const { appointment, depositPaid, balanceDue, emailSent } = location.state || {};

  if (!appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No booking information found</p>
          <Link to="/">
            <Button>Return Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFE9EF] via-[#FFC9D7] to-[#FFBCCD]">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-400 to-green-600 rounded-full mb-4">
              <CheckCircle className="text-white" size={48} />
            </div>
            <h1 className="text-4xl font-bold mb-2 text-gray-800">
              Booking Confirmed!
            </h1>
            <p className="text-gray-600 text-lg">
              Your appointment has been successfully scheduled
            </p>
            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-green-700 font-medium">
                📧 A confirmation email has been sent to <strong>{appointment.customerEmail}</strong>
              </p>
            </div>
          </div>

          <Card className="p-8 mb-6">
            <h2 className="text-xl font-bold mb-6 text-gray-800">Appointment Details</h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="text-pink-500 mt-1" size={20} />
                <div>
                  <p className="font-medium text-gray-800">Date</p>
                  <p className="text-gray-600">
                    {formatDate(appointment.appointmentDate)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="text-pink-500 mt-1" size={20} />
                <div>
                  <p className="font-medium text-gray-800">Time</p>
                  <p className="text-gray-600">{formatTime12Hour(appointment.appointmentTime)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="text-pink-500 mt-1" size={20} />
                <div>
                  <p className="font-medium text-gray-800">Confirmation Email</p>
                  <p className="text-gray-600">{appointment.customerEmail}</p>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h3 className="font-semibold mb-2 text-gray-800">Services Booked:</h3>
                <ul className="space-y-1">
                  {(appointment.services || []).map((item: any, index: number) => {
                    // Handle both CartItem format {service: {...}} and direct Service format
                    const service = item.service || item;
                    return (
                      <li key={index} className="text-gray-600">
                        • {service.title || 'Unknown Service'} - ${service.price || 0}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </Card>

          <Card className="p-8 mb-6 bg-[#FFE9EF]">
            <div className="flex items-center gap-3 mb-4">
              <DollarSign className="text-pink-600" size={24} />
              <h3 className="text-lg font-bold text-gray-800">Payment Summary</h3>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Amount</span>
                <span className="font-medium">${appointment.totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Deposit Paid</span>
                <span className="font-semibold">${depositPaid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-pink-600 text-lg font-bold">
                <span>Balance Due at Appointment</span>
                <span>${balanceDue.toFixed(2)}</span>
              </div>
            </div>
          </Card>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">Important Information</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>✓ You'll receive a confirmation email shortly at {appointment.customerEmail}</li>
            <li>✓ Please bring the remaining balance of ${balanceDue.toFixed(2)} to your appointment</li>
            <li>✓ Please arrive on time for your scheduled appointment</li>
          </ul>
        </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/" className="flex-1">
              <Button className="w-full" variant="outline">
                Return Home
              </Button>
            </Link>
            <Link to="/services" className="flex-1">
              <Button className="w-full bg-[#FF8CAA] hover:bg-[#FF6B96] text-white font-semibold">
                Book Another Service
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;
