import { Appointment, BlockedDate, BlockedTime } from '@/types';

const APPOINTMENTS_KEY = 'nail_salon_appointments';
const BLOCKED_DATES_KEY = 'nail_salon_blocked_dates';
const BLOCKED_TIMES_KEY = 'nail_salon_blocked_times';

// Load from localStorage
const loadAppointments = (): Appointment[] => {
  const stored = localStorage.getItem(APPOINTMENTS_KEY);
  if (stored) {
    console.log('Loading appointments from localStorage');
    return JSON.parse(stored);
  }
  return [];
};

const saveAppointments = (data: Appointment[]) => {
  console.log('Saving appointments to localStorage');
  localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(data));
};

const loadBlockedDates = (): BlockedDate[] => {
  const stored = localStorage.getItem(BLOCKED_DATES_KEY);
  if (stored) {
    console.log('Loading blocked dates from localStorage');
    return JSON.parse(stored);
  }
  return [];
};

const saveBlockedDates = (data: BlockedDate[]) => {
  console.log('Saving blocked dates to localStorage');
  localStorage.setItem(BLOCKED_DATES_KEY, JSON.stringify(data));
};

const loadBlockedTimes = (): BlockedTime[] => {
  const stored = localStorage.getItem(BLOCKED_TIMES_KEY);
  if (stored) {
    console.log('Loading blocked times from localStorage');
    return JSON.parse(stored);
  }
  return [];
};

const saveBlockedTimes = (data: BlockedTime[]) => {
  console.log('Saving blocked times to localStorage');
  localStorage.setItem(BLOCKED_TIMES_KEY, JSON.stringify(data));
};

let appointments: Appointment[] = loadAppointments();
let blockedDates: BlockedDate[] = loadBlockedDates();
let blockedTimes: BlockedTime[] = loadBlockedTimes();

// Appointments
export const getAppointmentsFromLocalStorage = async (): Promise<Appointment[]> => {
  console.log('Fetching appointments');
  await new Promise(resolve => setTimeout(resolve, 300));
  return appointments;
};

export const createAppointment = async (appointment: Omit<Appointment, 'id' | 'createdAt'>): Promise<Appointment> => {
  console.log('Creating appointment:', appointment);
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const newAppointment: Appointment = {
    ...appointment,
    id: Date.now().toString(),
    createdAt: new Date()
  };
  
  appointments.push(newAppointment);
  saveAppointments(appointments);
  return newAppointment;
};

export const updateAppointmentStatus = async (id: string, status: Appointment['status']): Promise<Appointment> => {
  console.log('Updating appointment status:', id, status);
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const index = appointments.findIndex(a => a.id === id);
  if (index === -1) throw new Error('Appointment not found');
  
  appointments[index].status = status;
  saveAppointments(appointments);
  return appointments[index];
};

// Blocked Dates
export const getBlockedDates = async (): Promise<BlockedDate[]> => {
  console.log('Fetching blocked dates');
  await new Promise(resolve => setTimeout(resolve, 200));
  return blockedDates;
};

export const addBlockedDate = async (date: string, reason?: string): Promise<BlockedDate> => {
  console.log('Blocking date:', date);
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const blocked: BlockedDate = {
    id: Date.now().toString(),
    date,
    reason
  };
  
  blockedDates.push(blocked);
  saveBlockedDates(blockedDates);
  return blocked;
};

export const removeBlockedDate = async (id: string): Promise<void> => {
  console.log('Removing blocked date:', id);
  await new Promise(resolve => setTimeout(resolve, 200));
  blockedDates = blockedDates.filter(d => d.id !== id);
  saveBlockedDates(blockedDates);
};

// Blocked Times
export const getBlockedTimes = async (): Promise<BlockedTime[]> => {
  console.log('Fetching blocked times');
  await new Promise(resolve => setTimeout(resolve, 200));
  return blockedTimes;
};

export const addBlockedTime = async (time: string, date?: string): Promise<BlockedTime> => {
  console.log('Blocking time:', time, date);
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const blocked: BlockedTime = {
    id: Date.now().toString(),
    time,
    date
  };
  
  blockedTimes.push(blocked);
  saveBlockedTimes(blockedTimes);
  return blocked;
};

export const removeBlockedTime = async (id: string): Promise<void> => {
  console.log('Removing blocked time:', id);
  await new Promise(resolve => setTimeout(resolve, 200));
  blockedTimes = blockedTimes.filter(t => t.id !== id);
  saveBlockedTimes(blockedTimes);
};
