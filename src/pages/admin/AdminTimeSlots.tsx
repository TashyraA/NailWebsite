import AdminLayout from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { formatTime12Hour } from '@/utils/dateTime';

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
];

const AdminTimeSlots = () => (
  <AdminLayout>
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Available Time Slots</h1>
      <p className="text-gray-600 mb-8">These standard appointment times are included in the static site configuration.</p>
      <Card className="p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {TIME_SLOTS.map(time => (
            <div key={time} className="flex items-center gap-2 rounded-lg bg-pink-50 px-4 py-3 text-gray-700">
              <Clock size={16} className="text-pink-500" />
              {formatTime12Hour(time)}
            </div>
          ))}
        </div>
      </Card>
    </div>
  </AdminLayout>
);

export default AdminTimeSlots;