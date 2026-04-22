import { supabase } from '@/lib/supabase';
import { Service } from '@/types';

// Cache for services to prevent excessive API calls
const servicesCache = new Map<string, { data: Service; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const getServices = async (): Promise<Service[]> => {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('title', { ascending: true });

    if (error) throw error;

    // Transform snake_case to camelCase for frontend compatibility
    return (data || []).map(service => ({
      id: service.id,
      title: service.title,
      description: service.description,
      price: service.price,
      deposit: service.deposit,
      duration: service.duration,
      category: service.category,
      images: service.images || [],
      isActive: service.is_active,
      createdAt: new Date(service.created_at)
    }));
  } catch (error) {
    console.error('Failed to fetch services:', error);
    return [];
  }
};

export const getAllServices = async (): Promise<Service[]> => {
  try {
    console.log('Fetching all services from Supabase (admin)');
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('title', { ascending: true });

    if (error) throw error;

    // Transform snake_case to camelCase for frontend compatibility
    return (data || []).map(service => ({
      id: service.id,
      title: service.title,
      description: service.description,
      price: service.price,
      deposit: service.deposit,
      duration: service.duration,
      category: service.category,
      images: service.images || [],
      isActive: service.is_active,
      createdAt: new Date(service.created_at)
    }));
  } catch (error) {
    console.error('Failed to fetch all services:', error);
    return [];
  }
};

export const getServiceById = async (id: string): Promise<Service | null> => {
  try {
    // Check cache first
    const cached = servicesCache.get(id);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return cached.data;
    }

    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Service not found:', error);
      return null;
    }

    // Transform snake_case to camelCase for frontend compatibility
    const service = {
      id: data.id,
      title: data.title,
      description: data.description,
      price: data.price,
      deposit: data.deposit,
      duration: data.duration,
      category: data.category,
      images: data.images || [],
      isActive: data.is_active,
      createdAt: new Date(data.created_at)
    };

    // Cache the result
    servicesCache.set(id, { data: service, timestamp: Date.now() });
    
    return service;
  } catch (error) {
    console.error('Failed to fetch service:', error);
    return null;
  }
};

export const createService = async (service: Omit<Service, 'id' | 'createdAt'>): Promise<Service> => {
  try {
    console.log('Creating service with data:', service);
    console.log('Images being saved:', service.images);
    
    const { data, error } = await supabase
      .from('services')
      .insert([{
        title: service.title,
        description: service.description,
        price: service.price,
        deposit: service.deposit,
        duration: service.duration,
        category: service.category,
        images: service.images,
        is_active: service.isActive
      }])
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating service:', error);
      throw error;
    }

    console.log('Service created in database:', data);
    
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      price: data.price,
      deposit: data.deposit,
      duration: data.duration,
      category: data.category,
      images: data.images || [],
      isActive: data.is_active,
      createdAt: new Date(data.created_at)
    };
  } catch (error) {
    console.error('Failed to create service:', error);
    throw error;
  }
};

export const updateService = async (id: string, updates: Partial<Omit<Service, 'id' | 'createdAt'>>): Promise<Service> => {
  try {
    console.log('Updating service with ID:', id);
    console.log('Update data:', updates);
    console.log('Images being updated:', updates.images);
    
    const { data, error } = await supabase
      .from('services')
      .update({
        title: updates.title,
        description: updates.description,
        price: updates.price,
        deposit: updates.deposit,
        duration: updates.duration,
        category: updates.category,
        images: updates.images,
        is_active: updates.isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error updating service:', error);
      throw error;
    }

    console.log('Service updated in database:', data);
    
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      price: data.price,
      deposit: data.deposit,
      duration: data.duration,
      category: data.category,
      images: data.images || [],
      isActive: data.is_active,
      createdAt: new Date(data.created_at)
    };
  } catch (error) {
    console.error('Failed to update service:', error);
    throw error;
  }
};

export const deleteService = async (id: string): Promise<void> => {
  try {
    console.log('Deleting service:', id);
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to delete service:', error);
    throw error;
  }
};