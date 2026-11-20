
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import type { CartItem, Service } from '@/types';

interface CartContextType {
  items: CartItem[];
  addToCart: (service: Service) => void;
  removeFromCart: (serviceId: string) => void;
  updateQuantity: (
    serviceId: string,
    quantity: number
  ) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalDeposit: () => number;
  getItemCount: () => number;
  refreshCartItems: () => Promise<void>;
}

const CartContext =
  createContext<CartContextType | null>(null);

const CART_STORAGE_KEY = 'cart';

function loadSavedCart(): CartItem[] {
  try {
    const saved = localStorage.getItem(
      CART_STORAGE_KEY
    );

    if (!saved) {
      return [];
    }

    const parsed: unknown = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item): item is CartItem =>
        item !== null &&
        typeof item === 'object' &&
        item.service !== null &&
        typeof item.service === 'object' &&
        typeof item.service.id === 'string' &&
        item.service.id.length > 0 &&
        typeof item.quantity === 'number' &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0
    );
  } catch (error) {
    console.error(
      'Unable to load saved cart:',
      error
    );

    return [];
  }
}

async function fetchActiveServices(): Promise<Service[]> {
  const response = await fetch('/api/services', {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(
      `Unable to refresh services (${response.status}).`
    );
  }

  const result = await response.json();

  if (
    result?.success !== true ||
    !Array.isArray(result.services)
  ) {
    throw new Error(
      'The service catalog returned invalid data.'
    );
  }

  return result.services as Service[];
}

function synchronizeCart(
  currentItems: CartItem[],
  activeServices: Service[]
): CartItem[] {
  const serviceMap = new Map(
    activeServices.map(service => [
      service.id,
      service,
    ])
  );

  const updatedItems: CartItem[] = [];

  for (const item of currentItems) {
    const latestService = serviceMap.get(
      item.service.id
    );

    // Inactive or removed services are not
    // available for new appointment requests.
    if (!latestService) {
      continue;
    }

    updatedItems.push({
      service: latestService,
      quantity: item.quantity,
    });
  }

  return updatedItems;
}

function areCartItemsEqual(
  first: CartItem[],
  second: CartItem[]
): boolean {
  return (
    JSON.stringify(first) ===
    JSON.stringify(second)
  );
}

export const CartProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [items, setItems] =
    useState<CartItem[]>(loadSavedCart);

  const [hasLoadedCart, setHasLoadedCart] =
    useState(false);

  const itemsRef = useRef(items);

  const refreshRequestRef =
    useRef<Promise<void> | null>(null);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const refreshCartItems =
    useCallback(async (): Promise<void> => {
      if (refreshRequestRef.current) {
        return refreshRequestRef.current;
      }

      const request = (async () => {
        try {
          const activeServices =
            await fetchActiveServices();

          setItems(currentItems => {
            const updatedItems =
              synchronizeCart(
                currentItems,
                activeServices
              );

            return areCartItemsEqual(
              currentItems,
              updatedItems
            )
              ? currentItems
              : updatedItems;
          });

          setHasLoadedCart(true);
        } catch (error) {
          console.error(
            'Unable to refresh cart from Neon:',
            error
          );

          // Keep the cart when the network fails.
          // We should not erase a customer's
          // selections because of a temporary
          // server error.
          setHasLoadedCart(true);
        }
      })();

      refreshRequestRef.current = request;

      try {
        await request;
      } finally {
        refreshRequestRef.current = null;
      }
    }, []);

  // Refresh service details when the cart
  // provider first loads.
  useEffect(() => {
    void refreshCartItems();
  }, [refreshCartItems]);

  // Refresh again when customers return
  // to the website after switching tabs.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible'
      ) {
        void refreshCartItems();
      }
    };

    window.addEventListener(
      'focus',
      refreshCartItems
    );

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange
    );

    return () => {
      window.removeEventListener(
        'focus',
        refreshCartItems
      );

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      );
    };
  }, [refreshCartItems]);

  // Save cart selections locally.
  useEffect(() => {
    if (!hasLoadedCart) {
      return;
    }

    try {
      localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(items)
      );
    } catch (error) {
      console.error(
        'Unable to save cart:',
        error
      );
    }
  }, [items, hasLoadedCart]);

  // Synchronize cart selections between tabs.
  useEffect(() => {
    const handleStorageChange = (
      event: StorageEvent
    ) => {
      if (event.key !== CART_STORAGE_KEY) {
        return;
      }

      const updatedItems = loadSavedCart();

      setItems(updatedItems);

      void refreshCartItems();
    };

    window.addEventListener(
      'storage',
      handleStorageChange
    );

    return () => {
      window.removeEventListener(
        'storage',
        handleStorageChange
      );
    };
  }, [refreshCartItems]);

  const addToCart = (service: Service) => {
    setItems(previous => {
      const existing = previous.find(
        item =>
          item.service.id === service.id
      );

      if (existing) {
        return previous.map(item =>
          item.service.id === service.id
            ? {
                ...item,
                service,
                quantity:
                  item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...previous,
        {
          service,
          quantity: 1,
        },
      ];
    });
  };

  const removeFromCart = (
    serviceId: string
  ) => {
    setItems(previous =>
      previous.filter(
        item =>
          item.service.id !== serviceId
      )
    );
  };

  const updateQuantity = (
    serviceId: string,
    quantity: number
  ) => {
    if (
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      removeFromCart(serviceId);
      return;
    }

    setItems(previous =>
      previous.map(item =>
        item.service.id === serviceId
          ? {
              ...item,
              quantity,
            }
          : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const getTotalPrice = () => {
    return items.reduce(
      (total, item) =>
        total +
        item.service.price *
          item.quantity,
      0
    );
  };

  // Deposits are now selected by the
  // administrator after reviewing an
  // appointment request.
  //
  // Keep this method temporarily so
  // existing components don't break.
  const getTotalDeposit = () => {
    return 0;
  };

  const getItemCount = () => {
    return items.reduce(
      (count, item) =>
        count + item.quantity,
      0
    );
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotalPrice,
        getTotalDeposit,
        getItemCount,
        refreshCartItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(
      'useCart must be used within CartProvider'
    );
  }

  return context;
};
