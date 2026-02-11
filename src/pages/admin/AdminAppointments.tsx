import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAppointments, updateAppointmentStatus } from '@/services/appointmentService';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Mail, Phone, DollarSign, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDate, formatTime12Hour } from '@/utils/dateTime';

const AdminAppointments = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => getAppointments(),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'confirmed' | 'cancelled' | 'completed' }) =>
      updateAppointmentStatus(id, status),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast({ 
        title: 'Appointment updated!',
        description: `Status changed to ${variables.status}. Email sent to customer.`
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update appointment',
        variant: 'destructive'
      });
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'completed':
        return 'bg-blue-100 text-blue-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <AdminLayout>
      <div>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Appointments</h1>
          <Badge variant="outline" className="text-lg px-4 py-2">
            Total: {appointments?.length || 0}
          </Badge>
        </div>

        <div className="space-y-4">
          {appointments?.map(appointment => (
            <Card key={appointment.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-1">
                        {appointment.customerName}
                      </h3>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Mail size={16} className="text-pink-500" />
                          <span>{appointment.customerEmail}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone size={16} className="text-pink-500" />
                          <span>{appointment.customerPhone}</span>
                        </div>
                      </div>
                    </div>
                    <Badge className={getStatusColor(appointment.status)}>
                      {appointment.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Calendar size={18} className="text-pink-500" />
                      <span className="font-medium">
                        {formatDate(appointment.appointmentDate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Clock size={18} className="text-pink-500" />
                      <span className="font-medium">{formatTime12Hour(appointment.appointmentTime)}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Services:</h4>
                    <div className="flex flex-wrap gap-3">
                      {(appointment.services || []).map((item: any, idx: number) => {
                        // Handle both CartItem format {service: {...}} and direct Service format
                        const service = item.service || item;
                        const imageUrl = service.images?.[0] || service.image;
                        return (
                          <div key={idx} className="flex items-center gap-2 bg-pink-50 rounded-lg p-2 border border-pink-200">
                            {imageUrl && (
                              <img 
                                src={imageUrl} 
                                alt={service.title || 'Service'} 
                                className="w-10 h-10 rounded object-cover"
                              />
                            )}
                            <div>
                              <p className="font-medium text-sm text-gray-800">{service.title || 'Unknown Service'}</p>
                              <p className="text-xs text-pink-600">${service.price || 0}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {appointment.notes && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-800 mb-1">Notes:</h4>
                      <p className="text-gray-600 text-sm">{appointment.notes}</p>
                    </div>
                  )}
                </div>

                <div className="lg:w-64 space-y-4">
                  <Card className="p-4 bg-gradient-to-br from-pink-50 to-purple-50">
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="text-pink-600" size={20} />
                      <h4 className="font-semibold text-gray-800">Payment</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total:</span>
                        <span className="font-semibold">${(appointment.totalPrice || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span>Deposit Paid:</span>
                        <span className="font-semibold">${(appointment.depositPaid || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={appointment.balancePaidAt ? 'text-green-600' : 'text-pink-600'}>
                          Balance:
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${appointment.balancePaidAt ? 'text-green-600' : 'text-pink-600'}`}>
                            ${(appointment.balanceDue || 0).toFixed(2)}
                          </span>
                          {appointment.balancePaidAt ? (
                            <CheckCircle2 className="text-green-600" size={16} />
                          ) : appointment.balanceDue > 0 ? (
                            <AlertCircle className="text-pink-600" size={16} />
                          ) : null}
                        </div>
                      </div>
                      {appointment.balancePaidAt && (
                        <div className="mt-3 pt-2 border-t border-pink-200">
                          <div className="text-xs text-gray-500">
                            <div>Balance paid: {new Date(appointment.balancePaidAt).toLocaleDateString()}</div>
                            <div>Method: {appointment.balancePaymentMethod || 'Stripe'}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Update Status:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            id: appointment.id,
                            status: 'confirmed'
                          })
                        }
                        className="text-green-600 hover:bg-green-50"
                      >
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            id: appointment.id,
                            status: 'completed'
                          })
                        }
                        className="text-blue-600 hover:bg-blue-50"
                      >
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            id: appointment.id,
                            status: 'cancelled'
                          })
                        }
                        className="text-red-600 hover:bg-red-50"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {appointments?.length === 0 && (
            <Card className="p-12 text-center">
              <Calendar className="mx-auto text-gray-300 mb-4" size={64} />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No appointments yet</h3>
              <p className="text-gray-500">Appointments will appear here when customers book services</p>
            </Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAppointments;
