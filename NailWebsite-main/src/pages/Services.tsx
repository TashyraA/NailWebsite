import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getServices } from '@/services/serviceSupabase';
import ServiceCard from '@/components/ServiceCard';
import { Loader2 } from 'lucide-react';

const Services = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const { data: services, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: getServices,
  });

  const categories = ['All', ...(services ? Array.from(new Set(services.map(s => s.category))) : [])];

  const filteredServices = services?.filter(
    service => selectedCategory === 'All' || service.category === selectedCategory
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFE9EF] via-[#FFC9D7] to-[#FFBCCD]">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-800">
            Our Services
          </h1>
          <p className="text-gray-700 text-lg max-w-2xl mx-auto">
            Choose from our selection of premium nail services, each crafted to perfection
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                selectedCategory === category
                  ? 'bg-[#FF8CAA] text-white shadow-lg scale-105'
                  : 'bg-[#FFE9EF] text-gray-700 hover:bg-[#FFC9D7] shadow-md hover:shadow-lg'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Services Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="animate-spin text-pink-500" size={40} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredServices?.map(service => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        )}

        {filteredServices?.length === 0 && !isLoading && (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">No services found in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Services;
