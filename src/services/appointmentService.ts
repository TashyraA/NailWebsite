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
  notes?: string;
}

const DEFAULT_TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
];

export const getAvailableTimeSlots = async (): Promise<string[]> => DEFAULT_TIME_SLOTS;
export const getBookedSlotsForDate = async (_date: string): Promise<string[]> => [];
export const getBlockedDates = async (): Promise<any[]> => [];
export const getBlockedTimes = async (): Promise<any[]> => [];

export const createAppointment = async (data: CreateAppointmentData) => {
  const response = await fetch('/api/booking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Unable to create booking');
  return result;
};

export const getAppointments = async (): Promise<any[]> => [];
export const updateAppointmentStatus = async (_appointmentId: string, _status: string) => {
  throw new Error('Confirm appointments from the secure link in the notification email.');
};
export const getAppointmentById = async () => null;
export const addBlockedDate = async (_date: string, _reason?: string) => null;
export const removeBlockedDate = async (_id: string) => undefined;
export const addBlockedTime = async (_time: string, _date: string) => null;
export const removeBlockedTime = async (_id: string) => undefined;