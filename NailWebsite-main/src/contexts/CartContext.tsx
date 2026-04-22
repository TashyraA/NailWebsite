import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Service } from '@/types';
import { getServiceById } from '@/services/serviceSupabase';

interface CartContextType {
  items: CartItem[];
  addToCart: (service: Service) => void;
  removeFromCart: (serviceId: string) => void;
  updateQuantity: (serviceId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalDeposit: () => number;
  getItemCount: () => number;
  refreshCartItems: () => Promise<void>;
}

const CartContext = createContext<CartContextType | null>(null);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });

  // Refresh cart items with latest service data on mount only (prevent infinite loops)
  useEffect(() => {
    const refreshItems = async () => {
      if (items.length === 0) return;
      
      console.log('Refreshing cart items with latest service data');
      try {
        const updatedItems = await Promise.all(
          items.map(async (item) => {
            try {
              const latestService = await getServiceById(item.service.id);
              if (latestService) {
                return { ...item, service: latestService };
              }
            } catch (error) {
              console.error('Failed to refresh service:', item.service.id, error);
            }
            return item;
          })
        );
        
        // Only update if there are actual changes
        const hasChanges = updatedItems.some((item, index) => {
          const oldItem = items[index];
          return !oldItem || JSON.stringify(item.service) !== JSON.stringify(oldItem.service);
        });
        
        if (hasChanges) {
          console.log('Cart items updated with latest data');
          setItems(updatedItems);
        }
      } catch (error) {
        console.error('Error refreshing cart items:', error);
      }
    };

    // Only refresh once on component mount, not on every items change
    const timeoutId = setTimeout(refreshItems, 100);
    return () => clearTimeout(timeoutId);
  }, []); // Empty dependency array to only run once on mount
    
  // Save items to localStorage whenever cart changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);
    
  // Listen for storage events to sync across tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'nail_salon_services') {
        console.log('Services updated, refreshing cart');
        refreshCartItems();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const refreshCartItems = async () => {
    console.log('Manually refreshing cart items');
    const updatedItems = await Promise.all(
      items.map(async (item) => {
        const latestService = await getServiceById(item.service.id);
        if (latestService) {
          return { ...item, service: latestService };
        }
        return item;
      })
    );
    setItems(updatedItems);
  };

  const addToCart = (service: Service) => {
    console.log('Adding to cart:', service.title);
    setItems(prev => {
      const existing = prev.find(item => item.service.id === service.id);
      if (existing) {
        return prev.map(item =>
          item.service.id === service.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { service, quantity: 1 }];
    });
  };

  const removeFromCart = (serviceId: string) => {
    console.log('Removing from cart:', serviceId);
    setItems(prev => prev.filter(item => item.service.id !== serviceId));
  };

  const updateQuantity = (serviceId: string, quantity: number) => {
    console.log('Updating quantity:', serviceId, quantity);
    if (quantity <= 0) {
      removeFromCart(serviceId);
      return;
    }
    setItems(prev =>
      prev.map(item =>
        item.service.id === serviceId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    console.log('Clearing cart');
    setItems([]);
  };

  const getTotalPrice = () => {
    return items.reduce((total, item) => total + item.service.price * item.quantity, 0);
  };

  const getTotalDeposit = () => {
    return items.reduce((total, item) => total + item.service.deposit * item.quantity, 0);
  };

  const getItemCount = () => {
    return items.reduce((count, item) => count + item.quantity, 0);
  };

  return (
    <CartContext.Provider value={{
      items,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getTotalPrice,
      getTotalDeposit,
      getItemCount,
      refreshCartItems
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
