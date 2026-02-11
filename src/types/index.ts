export interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  deposit: number;
  duration: number; // in minutes
  category: string;
  images: string[];
  isActive: boolean;
  createdAt: Date;
}

export interface CartItem {
  service: Service;
  quantity: number;
}

export interface BlockedDate {
  id: string;
  date: string; // YYYY-MM-DD format
  reason?: string;
}

export interface BlockedTime {
  id: string;
  time: string; // HH:MM format
  date?: string; // optional - if for specific date only
}

export interface Appointment {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  services: Service[];
  appointmentDate: string;
  appointmentTime: string;
  totalPrice: number;
  depositPaid: number;
  remainingBalance: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: Date;
  notes?: string;
}

export interface AdminSettings {
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  businessAddress: string;
  workingHours: {
    start: string;
    end: string;
  };
}
