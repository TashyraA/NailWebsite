import { Service } from '@/types';

const STORAGE_KEY = 'nail_salon_services';
export const BOOKING_DEPOSIT = 20;

const DEFAULT_SERVICES: Service[] = [
  {
    id: 'classic-set', title: 'Classic Full Set',
    description: 'A timeless, polished set tailored to your preferred length and shape.',
    price: 65, deposit: BOOKING_DEPOSIT, duration: 120, category: 'Full Sets', images: [], isActive: true,
    createdAt: new Date('2025-01-01')
  },
  {
    id: 'gel-manicure', title: 'Gel Manicure',
    description: 'Long-lasting gel color with a clean, glossy finish.',
    price: 45, deposit: BOOKING_DEPOSIT, duration: 60, category: 'Manicures', images: [], isActive: true,
    createdAt: new Date('2025-01-01')
  },
  {
    id: 'test-service', title: 'Test Service',
    description: 'Temporary service for testing the cart, $20 deposit, calendar, and Stripe checkout flow.',
    price: 80, deposit: BOOKING_DEPOSIT, duration: 120, category: 'Test Services', images: [], isActive: true,
    createdAt: new Date('2025-01-01')
  }
];

// Load services from localStorage or use default data
const loadServices = (): Service[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    console.log('Loading services from localStorage');
    const storedServices = JSON.parse(stored).map((service: Service) => ({ ...service, deposit: BOOKING_DEPOSIT }));
    return storedServices.some((service: Service) => service.id === 'test-service')
      ? storedServices
      : [...storedServices, DEFAULT_SERVICES.find(service => service.id === 'test-service')!];
  }
  console.log('No services in storage, using default catalog');
  return DEFAULT_SERVICES;
};

const saveServices = (services: Service[]) => {
  console.log('Saving services to localStorage');
  localStorage.setItem(STORAGE_KEY, JSON.stringify(services));
};

let services: Service[] = loadServices();

export const getServices = async (): Promise<Service[]> => {
  console.log('Fetching services');
  await new Promise(resolve => setTimeout(resolve, 300));
  return services.filter(s => s.isActive);
};

export const getAllServices = async (): Promise<Service[]> => {
  console.log('Fetching all services (admin)');
  await new Promise(resolve => setTimeout(resolve, 300));
  return services;
};

export const getServiceById = async (id: string): Promise<Service | undefined> => {
  console.log('Fetching service:', id);
  await new Promise(resolve => setTimeout(resolve, 200));
  return services.find(s => s.id === id);
};

export const createService = async (service: Omit<Service, 'id' | 'createdAt'>): Promise<Service> => {
  console.log('Creating service:', service);
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const newService: Service = {
    ...service,
    id: Date.now().toString(),
    createdAt: new Date()
  };
  
  services.push(newService);
  saveServices(services);
  return newService;
};

export const updateService = async (id: string, updates: Partial<Service>): Promise<Service> => {
  console.log('Updating service:', id, updates);
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const index = services.findIndex(s => s.id === id);
  if (index === -1) throw new Error('Service not found');
  
  services[index] = { ...services[index], ...updates };
  saveServices(services);
  return services[index];
};

export const deleteService = async (id: string): Promise<void> => {
  console.log('Deleting service:', id);
  await new Promise(resolve => setTimeout(resolve, 300));
  services = services.filter(s => s.id !== id);
  saveServices(services);
};
