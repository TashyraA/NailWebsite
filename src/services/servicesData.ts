
import { Service } from '@/types';

const STORAGE_KEY = 'nail_salon_services';
const CATALOG_VERSION_KEY = 'nail_salon_catalog_version';

// Updated version so existing browsers receive the new photo paths.
const CATALOG_VERSION = 'briana-services-v4';

export const BOOKING_DEPOSIT = 20;

const CREATED_AT = new Date('2025-01-01');

const makeService = (
  id: string,
  title: string,
  description: string,
  price: number,
  duration: number,
  category: string,
  image?: string
): Service => ({
  id,
  title,
  description,
  price,
  deposit: BOOKING_DEPOSIT,
  duration,
  category,
  images: image ? [image] : [],
  isActive: true,
  createdAt: CREATED_AT,
});

const DEFAULT_SERVICES: Service[] = [
  // ==========================================
  // ACRYLIC FULL SETS
  // ==========================================

  makeService(
    'acrylic-short',
    'Full Set Acrylic — Short',
    'Short acrylic full set with one solid color.',
    80,
    90,
    'Acrylic Full Sets',
    '/services/IMG_1.png'
  ),

  makeService(
    'acrylic-medium',
    'Full Set Acrylic — Medium',
    'Medium-length acrylic full set.',
    95,
    120,
    'Acrylic Full Sets',
    '/services/IMG_4.png'
  ),

  makeService(
    'acrylic-long',
    'Full Set Acrylic — Long',
    'Long acrylic full set with one solid color.',
    100,
    90,
    'Acrylic Full Sets',
    '/services/IMG_2.png'
  ),

  makeService(
    'acrylic-long-xl',
    'Full Set Acrylic — Long / XL',
    'Long to extra-long acrylic extensions. Pricing ranges from $100–$140 depending on the set.',
    100,
    150,
    'Acrylic Full Sets',
    '/services/IMG_5.png'
  ),

  makeService(
    'freestyle-short',
    'Freestyle Full Set — Short',
    'Starting at $90. Freestyle designs may include gems, multiple colors, glitter, ombré, foils, and more.',
    90,
    90,
    'Acrylic Full Sets',
    '/services/IMG_3.png'
  ),

  makeService(
    'acrylic-ombre',
    'Acrylic Ombré Full Set',
    'A soft, blended ombré acrylic manicure.',
    85,
    90,
    'Acrylic Full Sets',
    '/services/IMG_6.png'
  ),

  makeService(
    'acrylic-overlay',
    'Acrylic Overlay',
    'Acrylic applied over the natural nails for added strength and a polished finish.',
    75,
    90,
    'Acrylic Full Sets',
    '/services/IMG_7.png'
  ),

  // ==========================================
  // ACRYLIC FILLS
  // ==========================================

  makeService(
    'acrylic-fill',
    'Acrylic Fill',
    'For existing acrylic sets with up to 3 weeks of nail growth.',
    70,
    60,
    'Acrylic Fills',
    '/services/IMG_9.png'
  ),

  makeService(
    'overlay-fill',
    'Acrylic Overlay Fill',
    'Maintenance fill for an existing acrylic overlay.',
    60,
    60,
    'Acrylic Fills',
    '/services/IMG_10.png'
  ),

  makeService(
    'overlay-fill-design',
    'Acrylic Overlay Fill + Minimal Designs',
    'Acrylic overlay maintenance with minimal nail designs.',
    65,
    90,
    'Acrylic Fills',
    '/services/IMG_11.png'
  ),

  // ==========================================
  // NAIL ADD-ONS
  // ==========================================

  makeService(
    'soak-off',
    'Soak Off',
    'Removal of existing nail enhancements.',
    20,
    30,
    'Nail Add-Ons',
    '/services/IMG_12.png'
  ),

  makeService(
    'special-shapes',
    'Special Nail Shapes',
    'Add stiletto, almond, or duck nail shapes to your set.',
    6,
    10,
    'Nail Add-Ons',
    '/services/IMG_13.png'
  ),

  makeService(
    'french-tip',
    'French Tips',
    'Classic French-tip design add-on.',
    10,
    10,
    'Nail Add-Ons',
    '/services/IMG_14.png'
  ),

  makeService(
    'bling-french',
    'Blinged-Out French Tips',
    'French tips with added bling. Pricing ranges from $20–$30 depending on nail length.',
    20,
    30,
    'Nail Add-Ons',
    '/services/IMG_15.png'
  ),

  makeService(
    'nail-repair',
    'Nail Repair',
    'Starting at $6, up to $10 depending on nail length and design. Repairs within 3 days of the original appointment are complimentary.',
    6,
    10,
    'Nail Add-Ons',
    '/services/IMG_16.png'
  ),

  // ==========================================
  // PEDICURES & TOES
  // ==========================================

  makeService(
    'gel-pedicure',
    'Gel Pedicure',
    'Pedicure service finished with gel polish.',
    75,
    50,
    'Pedicures & Toes',
    '/services/IMG_17.png'
  ),

  makeService(
    'gel-toe-polish-change',
    'Gel Toe Polish Change',
    'Includes gel polish removal, nail clipping, filing, and buffing.',
    35,
    30,
    'Pedicures & Toes',
    '/services/IMG_18.png'
  ),

  makeService(
    'acrylic-big-toes',
    'Acrylic Big Toes',
    'Acrylic enhancements for the big toenails.',
    20,
    15,
    'Pedicures & Toes',
    '/services/IMG_19.png'
  ),

  makeService(
    'acrylic-big-toe-fill',
    'Acrylic Big Toe Fill',
    'Maintenance fill for acrylic big toes.',
    15,
    10,
    'Pedicures & Toes',
    '/services/IMG_20.png'
  ),

  makeService(
    'acrylic-toes-full',
    'Full Set Acrylic Toes',
    'Full acrylic toenail set. Does not include a wet pedicure; book that separately if needed.',
    80,
    60,
    'Pedicures & Toes',
    '/services/IMG_21.png'
  ),

  makeService(
    'acrylic-toes-fill',
    'All Acrylic Toes Fill',
    'Maintenance fill for a full set of acrylic toenails.',
    60,
    60,
    'Pedicures & Toes',
    '/services/IMG_22.png'
  ),

  makeService(
    'acrylic-toes-freestyle',
    'Full Set Acrylic Toe Freestyle',
    'Acrylic toenail full set with freestyle designs.',
    90,
    90,
    'Pedicures & Toes',
    '/services/IMG_23.png'
  ),

  makeService(
    'french-big-toes',
    'French Tips on Big Toes',
    'French-tip design add-on for big toes.',
    5,
    5,
    'Pedicures & Toes',
    '/services/IMG_24.png'
  ),

  // ==========================================
  // KIDS SERVICES — 12 & UNDER
  // ==========================================

  makeService(
    'kids-manicure',
    'Kids Manicure',
    'Manicure for children ages 12 and under.',
    35,
    30,
    'Kids Services',
    '/services/IMG_25.png'
  ),

  makeService(
    'kids-pedicure',
    'Kids Pedicure',
    'Pedicure for children ages 12 and under.',
    50,
    40,
    'Kids Services',
    '/services/IMG_27.png'
  ),

  makeService(
    'kids-toe-polish',
    'Kids Toe Polish Change',
    'Toenail polish change for children ages 12 and under.',
    30,
    20,
    'Kids Services',
    '/services/IMG_27.png'
  ),

  // ==========================================
  // MEN'S SERVICES
  // ==========================================

  makeService(
    'mens-manicure',
    "Men's Manicure",
    'Includes a complimentary sugar scrub, hot towel, hand massage, and optional gel top coat.',
    40,
    40,
    "Men's Services",
    '/services/IMG_28.png'
  ),

  makeService(
    'mens-pedicure',
    "Men's Pedicure",
    'Pedicure service for men.',
    65,
    45,
    "Men's Services",
    '/services/IMG_30.png'
  ),

  makeService(
    'mens-gel-manicure',
    "Men's Gel Manicure + Minimal Designs",
    'Gel manicure with minimal nail designs.',
    55,
    60,
    "Men's Services",
    '/services/IMG_29.png'
  ),
];

// ==========================================
// LOCAL STORAGE
// ==========================================

const readStoredServices = (): Service[] | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) return null;

    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) return null;

    return parsed as Service[];
  } catch (error) {
    console.error('Unable to read saved services:', error);
    return null;
  }
};

const saveServices = (items: Service[]) => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(items)
  );
};

// ==========================================
// LOAD SERVICES + UPDATE IMAGE PATHS
// ==========================================

const loadServices = (): Service[] => {
  const stored = readStoredServices();
  const version = localStorage.getItem(
    CATALOG_VERSION_KEY
  );

  if (version !== CATALOG_VERSION) {
    const oldDemoIds = new Set([
      'classic-set',
      'gel-manicure',
      'test-service',
    ]);

    const customServices = (stored ?? []).filter(
      service =>
        !oldDemoIds.has(service.id) &&
        !DEFAULT_SERVICES.some(
          item => item.id === service.id
        )
    );

    // Refresh the official catalog with updated
    // photo paths, while preserving custom services.
    const migrated = [
      ...DEFAULT_SERVICES,
      ...customServices,
    ];

    saveServices(migrated);

    localStorage.setItem(
      CATALOG_VERSION_KEY,
      CATALOG_VERSION
    );

    return migrated;
  }

  return stored ?? DEFAULT_SERVICES;
};

let services: Service[] = loadServices();

const delay = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

// ==========================================
// PUBLIC SERVICE FUNCTIONS
// ==========================================

export const getServices = async (): Promise<Service[]> => {
  await delay(300);

  return services.filter(
    service => service.isActive
  );
};

export const getAllServices = async (): Promise<Service[]> => {
  await delay(300);
  return services;
};

export const getServiceById = async (
  id: string
): Promise<Service | undefined> => {
  await delay(200);

  return services.find(
    service => service.id === id
  );
};

export const createService = async (
  service: Omit<Service, 'id' | 'createdAt'>
): Promise<Service> => {
  await delay(300);

  const newService: Service = {
    ...service,
    id: Date.now().toString(),
    createdAt: new Date(),
  };

  services = [...services, newService];

  saveServices(services);

  return newService;
};

export const updateService = async (
  id: string,
  updates: Partial<Service>
): Promise<Service> => {
  await delay(300);

  const index = services.findIndex(
    service => service.id === id
  );

  if (index === -1) {
    throw new Error('Service not found');
  }

  services[index] = {
    ...services[index],
    ...updates,
  };

  saveServices(services);

  return services[index];
};

export const deleteService = async (
  id: string
): Promise<void> => {
  await delay(300);

  services = services.filter(
    service => service.id !== id
  );

  saveServices(services);
};
