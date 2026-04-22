// Utility functions for consistent date and time handling

export const formatTime12Hour = (time24: string): string => {
  // Handle undefined/null input
  if (!time24) return 'Time not set';
  
  // Convert 24-hour time (HH:MM) to 12-hour format (h:MM AM/PM)
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export const formatDate = (dateStr: string): string => {
  // Handle undefined/null input
  if (!dateStr) return 'Date not set';
  
  // Format date string consistently
  const date = new Date(dateStr + 'T00:00:00'); // Add time to avoid timezone issues
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  });
};

export const formatDateForInput = (date: Date): string => {
  // Format date for input fields (YYYY-MM-DD) in local timezone
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseDate = (dateStr: string): Date => {
  // Parse date string avoiding timezone offset issues
  return new Date(dateStr + 'T00:00:00');
};

export const isSameDate = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};
