// Simulated admin authentication
// In production, this would connect to a real backend

const ADMIN_CREDENTIALS = {
  email: 'Inlovenailz@admin.com',
  password: 'LehotaB12@' // In production, use proper password hashing
};

export const login = async (email: string, password: string): Promise<boolean> => {
  console.log('Attempting login with:', email);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Make email comparison case-insensitive
  if (email.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase() && password === ADMIN_CREDENTIALS.password) {
    localStorage.setItem('isAdminAuthenticated', 'true');
    return true;
  }
  
  return false;
};

export const logout = () => {
  console.log('Logging out admin');
  localStorage.removeItem('isAdminAuthenticated');
};

export const isAuthenticated = (): boolean => {
  return localStorage.getItem('isAdminAuthenticated') === 'true';
};
