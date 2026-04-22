import { Service } from '@/types';

const STORAGE_KEY = 'nail_salon_services';

// Load services from localStorage or use default data
const loadServices = (): Service[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    console.log('Loading services from localStorage');
    return JSON.parse(stored);
  }
  console.log('No services in storage, starting with empty array');
  return [];
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
