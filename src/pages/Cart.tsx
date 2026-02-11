import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { Trash2, Plus, Minus, ShoppingBag, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const Cart = () => {
  const navigate = useNavigate();
  const { items, removeFromCart, updateQuantity, getTotalPrice, getTotalDeposit, refreshCartItems } = useCart();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshCartItems();
    setIsRefreshing(false);
  };

  const totalPrice = getTotalPrice();
  const totalDeposit = getTotalDeposit();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFE9EF] via-[#FFC9D7] to-[#FFBCCD]">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-md mx-auto text-center">
            <ShoppingBag className="mx-auto text-gray-300 mb-4" size={80} />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Add some services to get started!</p>
            <Button
              onClick={() => navigate('/services')}
              className="bg-[#FFBCCD] hover:bg-[#FFC9D7] text-gray-800 font-semibold"
            >
              Browse Services
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFE9EF] via-[#FFC9D7] to-[#FFBCCD]">
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
                  <h1 className="text-4xl font-bold mb-8 text-gray-800">
            Your Cart
          </h1>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={isRefreshing}
              className="flex items-center gap-2 border-[#FF8CAA] text-gray-800 hover:bg-[#FFE9EF]"
            >
            <RefreshCw className={isRefreshing ? 'animate-spin' : ''} size={16} />
            {isRefreshing ? 'Updating...' : 'Refresh Prices'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map(item => (
              <Card key={item.service.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex gap-4">
                  <img
                    src={item.service.images[0]}
                    alt={item.service.title}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-800 mb-1">
                      {item.service.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">{item.service.category}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{item.service.duration} mins</span>
                      <span>•</span>
                      <span>Deposit: ${item.service.deposit}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-800 mb-4">
                      ${item.service.price * item.quantity}
                    </p>
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        onClick={() => updateQuantity(item.service.id, item.quantity - 1)}
                        className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.service.id, item.quantity + 1)}
                        className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.service.id)}
                      className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1 ml-auto"
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-24">
              <h2 className="text-xl font-bold mb-4 text-gray-800">Order Summary</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-pink-600">
                  <span>Deposit Required</span>
                  <span>${totalDeposit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Balance Due (at appointment)</span>
                  <span>${(totalPrice - totalDeposit).toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t pt-4 mb-6">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-pink-600">${totalPrice.toFixed(2)}</span>
                </div>
              </div>

              <Button
                onClick={() => navigate('/checkout')}
                className="w-full bg-[#FF8CAA] hover:bg-[#FF6B96] text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                size="lg"
              >
                Proceed to Checkout
              </Button>

              <p className="text-xs text-gray-500 text-center mt-4">
                You'll pay ${totalDeposit.toFixed(2)} deposit now. 
                The remaining ${(totalPrice - totalDeposit).toFixed(2)} is due at your appointment.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
