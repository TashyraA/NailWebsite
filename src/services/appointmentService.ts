import { supabase, Appointment } from '@/lib/supabase';
import { sendAppointmentEmail, sendBusinessNotificationEmail } from './emailService';
import { formatDate, formatTime12Hour } from '@/utils/dateTime';

export interface CreateAppointmentData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  appointmentDate: string;
  appointmentTime: string;
  services: any[];
  totalPrice: number;
  depositPaid: number;
  balanceDue: number;
}

// Get enabled time slots from database
export const getAvailableTimeSlots = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('time_slots')
      .select('time')
      .eq('enabled', true)
      .order('time');

    if (error) {
      console.error('Database error fetching time slots:', error);
      // Fallback to default times if database fails
      return [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
        '15:00', '15:30', '16:00', '16:30', '17:00'
      ];
    }

    const availableTimes = (data || []).map(slot => slot.time);
    
    // If no time slots in database, return default times
    if (availableTimes.length === 0) {
      return [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
        '15:00', '15:30', '16:00', '16:30', '17:00'
      ];
    }
    
    return availableTimes;
  } catch (error) {
    console.error('Failed to fetch available time slots:', error);
    // Fallback to default times
    return [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
      '15:00', '15:30', '16:00', '16:30', '17:00'
    ];
  }
};

// Get booked time slots for a specific date
export const getBookedSlotsForDate = async (date: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('appointment_time, status, customer_name')
      .eq('appointment_date', date)
      .neq('status', 'cancelled');

    if (error) {
      console.error('Database error fetching booked slots:', error);
      throw error;
    }

    const bookedTimes = (data || []).map(apt => apt.appointment_time);
    
    return bookedTimes;
  } catch (error) {
    console.error('Failed to fetch booked slots:', error);
    return [];
  }
};

export const createAppointment = async (data: CreateAppointmentData) => {
  try {
    console.log('Creating appointment in database:', data);

    // Check if time slot is already booked BEFORE inserting
    const bookedSlots = await getBookedSlotsForDate(data.appointmentDate);
    console.log('Current booked slots for', data.appointmentDate, ':', bookedSlots);
    
    if (bookedSlots.includes(data.appointmentTime)) {
      console.error('Time slot conflict detected:', {
        requestedDate: data.appointmentDate,
        requestedTime: data.appointmentTime,
        existingBookedSlots: bookedSlots
      });
      throw new Error('This time slot is no longer available. Please select another time.');
    }

    console.log('No conflict detected, proceeding with appointment creation...');

    // Insert appointment into database
    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert([
        {
          customer_name: data.customerName,
          customer_email: data.customerEmail,
          customer_phone: data.customerPhone,
          appointment_date: data.appointmentDate,
          appointment_time: data.appointmentTime,
          services: Array.isArray(data.services) ? data.services : [],
          total_price: data.totalPrice,
          deposit_paid: data.depositPaid,
          balance_due: data.balanceDue,
          status: 'pending'
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('Appointment created successfully:', appointment);

    // Send booking confirmation email
    try {
      await sendAppointmentEmail('booking', {
        to: data.customerEmail,
        customerName: data.customerName,
        appointmentDate: formatDate(data.appointmentDate),
        appointmentTime: formatTime12Hour(data.appointmentTime),
        services: data.services,
        totalPrice: data.totalPrice,
        depositPaid: data.depositPaid,
        balanceDue: data.balanceDue
      });
      console.log('Booking confirmation email sent');
    } catch (emailError) {
      console.error('Email sending failed (appointment still created):', emailError);
      // Don't throw - appointment was created successfully
    }

    // Send business notification email
    try {
      await sendBusinessNotificationEmail({
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        appointmentDate: formatDate(data.appointmentDate),
        appointmentTime: formatTime12Hour(data.appointmentTime),
        services: data.services,
        totalPrice: data.totalPrice,
        depositPaid: data.depositPaid,
        balanceDue: data.balanceDue,
        appointmentId: appointment.id
      });
      console.log('Business notification email sent');
    } catch (emailError) {
      console.error('Business notification failed (appointment still created):', emailError);
      // Don't throw - appointment was created successfully
    }

    return appointment;
  } catch (error) {
    console.error('Failed to create appointment:', error);
    throw error;
  }
};

export const updateAppointmentStatus = async (
  appointmentId: string,
  newStatus: 'confirmed' | 'cancelled' | 'completed'
) => {
  try {
    console.log(`Updating appointment ${appointmentId} to ${newStatus}`);

    // Update appointment status
    const { data: appointment, error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('Appointment status updated:', appointment);

    // Generate payment link for confirmed appointments with balance due
    let paymentLink: string | undefined;
    if (newStatus === 'confirmed' && appointment.balance_due > 0) {
      try {
        console.log('Generating payment link for balance...');
        const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
          'create-balance-payment',
          {
            body: {
              appointmentId: appointment.id,
              customerEmail: appointment.customer_email,
              customerName: appointment.customer_name,
              amount: appointment.balance_due
            }
          }
        );

        if (paymentError) {
          console.error('Failed to generate payment link:', paymentError);
        } else if (paymentData?.paymentUrl) {
          paymentLink = paymentData.paymentUrl;
          console.log('Payment link generated:', paymentLink);
        }
      } catch (paymentLinkError) {
        console.error('Payment link generation error:', paymentLinkError);
        // Continue without payment link
      }
    }

    // Send appropriate email based on status
    try {
      await sendAppointmentEmail(newStatus, {
        to: appointment.customer_email,
        customerName: appointment.customer_name,
        appointmentDate: formatDate(appointment.appointment_date),
        appointmentTime: formatTime12Hour(appointment.appointment_time),
        services: appointment.services,
        totalPrice: appointment.total_price,
        depositPaid: appointment.deposit_paid,
        balanceDue: appointment.balance_due,
        paymentLink
      });
      console.log(`${newStatus} email sent`);
    } catch (emailError) {
      console.error('Email sending failed (status still updated):', emailError);
      // Don't throw - status was updated successfully
    }

    return appointment;
  } catch (error) {
    console.error('Failed to update appointment status:', error);
    throw error;
  }
};

export const getAppointments = async (status?: string) => {
  try {
    console.log('getAppointments called with status:', status);
    
    let query = supabase
      .from('appointments')
      .select('*')
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    console.log('Executing Supabase query...');
    const { data, error } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }

    console.log('Raw appointments data from Supabase:', data);
    console.log('Number of appointments found:', data?.length || 0);

    // Transform snake_case to camelCase for frontend compatibility
    const transformedData = (data || []).map(appointment => ({
      id: appointment.id,
      customerName: appointment.customer_name,
      customerEmail: appointment.customer_email,
      customerPhone: appointment.customer_phone,
      appointmentDate: appointment.appointment_date,
      appointmentTime: appointment.appointment_time,
      services: appointment.services || [],
      totalPrice: appointment.total_price,
      depositPaid: appointment.deposit_paid,
      balanceDue: appointment.balance_due,
      balancePaidAt: appointment.balance_paid_at || null,
      balancePaymentMethod: appointment.balance_payment_method || null,
      balanceStripeSessionId: appointment.balance_stripe_session_id || null,
      status: appointment.status,
      notes: appointment.notes || null,
      adminNotes: appointment.admin_notes || null,
      createdAt: appointment.created_at,
      updatedAt: appointment.updated_at,
    }));

    console.log('Transformed appointments data:', transformedData);
    return transformedData;
  } catch (error) {
    console.error('Failed to fetch appointments:', error);
    if (error && typeof error === 'object' && 'message' in error) {
      console.error('Error message:', error.message);
      console.error('Error details:', error);
    }
    throw error;
  }
};

export const getAppointmentById = async (id: string) => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Failed to fetch appointment:', error);
    throw error;
  }
};

export const getBlockedDates = async () => {
  try {
    const { data, error } = await supabase
      .from('blocked_dates')
      .select('*')
      .order('date', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Failed to fetch blocked dates:', error);
    return [];
  }
};

export const getBlockedTimes = async () => {
  try {
    const { data, error } = await supabase
      .from('blocked_times')
      .select('*')
      .order('time', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Failed to fetch blocked times:', error);
    return [];
  }
};

// Add blocked date to database
export const addBlockedDate = async (date: string, reason?: string) => {
  try {
    const { data, error } = await supabase
      .from('blocked_dates')
      .insert([{ date, reason }])
      .select()
      .single();

    if (error) throw error;

    console.log('Blocked date added:', data);
    return data;
  } catch (error) {
    console.error('Failed to add blocked date:', error);
    throw error;
  }
};

// Remove blocked date from database
export const removeBlockedDate = async (id: string) => {
  try {
    const { error } = await supabase
      .from('blocked_dates')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log('Blocked date removed:', id);
  } catch (error) {
    console.error('Failed to remove blocked date:', error);
    throw error;
  }
};

// Add blocked time to database
export const addBlockedTime = async (time: string, date: string) => {
  try {
    console.log('Attempting to add blocked time:', { time, date });
    const { data, error } = await supabase
      .from('blocked_times')
      .insert([{ time, date }])
      .select()
      .single();

    if (error) {
      console.error('Supabase error details:', JSON.stringify(error, null, 2));
      throw new Error(error.message || 'Failed to add blocked time');
    }

    console.log('Blocked time added:', data);
    return data;
  } catch (error: any) {
    console.error('Failed to add blocked time:', error?.message || JSON.stringify(error));
    throw error;
  }
};

// Remove blocked time from database
export const removeBlockedTime = async (id: string) => {
  try {
    const { error } = await supabase
      .from('blocked_times')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase error details:', JSON.stringify(error, null, 2));
      throw new Error(error.message || 'Failed to remove blocked time');
    }

    console.log('Blocked time removed:', id);
  } catch (error: any) {
    console.error('Failed to remove blocked time:', error?.message || JSON.stringify(error));
    throw error;
  }
};
