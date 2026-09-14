export const APPOINTMENT_DURATION_MINUTES = 120;
export const BUFFER_MINUTES = 15;
export const MINIMUM_NOTICE_HOURS = 24;

const toMinutes = (hours: number, minutes: number) => hours * 60 + minutes;
const fromMinutes = (minutes: number) => `${Math.floor(minutes / 60).toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}`;

export const getAvailableTimes = (date: Date, now = new Date()): string[] => {
  const day = date.getDay();
  if (day === 0) return [];
  const end = day === 6 ? toMinutes(15, 0) : toMinutes(17, 0);
  const earliest = new Date(now.getTime() + MINIMUM_NOTICE_HOURS * 60 * 60 * 1000);
  const slots: string[] = [];

  for (let start = toMinutes(9, 0); start + APPOINTMENT_DURATION_MINUTES <= end; start += APPOINTMENT_DURATION_MINUTES + BUFFER_MINUTES) {
    const slot = new Date(date);
    const [hours, minutes] = fromMinutes(start).split(':').map(Number);
    slot.setHours(hours, minutes, 0, 0);
    if (slot >= earliest) slots.push(fromMinutes(start));
  }
  return slots;
};

export const formatTime = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return `${hours % 12 || 12}:${minutes.toString().padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
};

export const formatDateForBooking = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;