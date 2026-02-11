import React from 'react';
import { Service } from '@/types';
import { Clock, DollarSign, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';

interface ServiceCardProps {
  service: Service;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service }) => {
  const { addToCart } = useCart();
  const { toast } = useToast();

  const handleAddToCart = () => {
    addToCart(service);
    toast({
      title: 'Added to cart!',
      description: `${service.title} has been added to your cart.`,
    });
  };

  return (
    <div className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
      <div className="relative h-64 overflow-hidden">
        <img
          src={service.images[0]}
          alt={service.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <Badge className="absolute top-4 right-4 bg-white/90 text-pink-600 border-0 backdrop-blur-sm">
          {service.category}
        </Badge>
      </div>

      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-2">{service.title}</h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{service.description}</p>

        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Clock size={16} className="text-pink-500" />
              <span>{service.duration} mins</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <DollarSign size={16} className="text-pink-500" />
              <span>Deposit: ${service.deposit}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-3xl font-bold text-gray-900">${service.price}</span>
          </div>
          <Button
            onClick={handleAddToCart}
            className="bg-[#FF8CAA] hover:bg-[#FF6B96] text-white font-semibold shadow-md hover:shadow-lg transition-all"
          >
            <ShoppingCart size={18} className="mr-2" />
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ServiceCard;
