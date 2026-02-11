import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBlockedDates,
  getBlockedTimes,
  addBlockedDate,
  addBlockedTime,
  removeBlockedDate,
  removeBlockedTime
} from '@/services/appointmentService';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Trash2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDateForInput, formatDate, formatTime12Hour } from '@/utils/dateTime';

const AdminSchedule = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [blockReason, setBlockReason] = useState('');
  const [blockTime, setBlockTime] = useState('');

  const { data: blockedDates } = useQuery({
    queryKey: ['blockedDates'],
    queryFn: getBlockedDates,
  });

  const { data: blockedTimes } = useQuery({
    queryKey: ['blockedTimes'],
    queryFn: getBlockedTimes,
  });

  const addDateMutation = useMutation({
    mutationFn: ({ date, reason }: { date: string; reason?: string }) =>
      addBlockedDate(date, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockedDates'] });
      toast({ title: 'Date blocked successfully!' });
      setSelectedDate(undefined);
      setBlockReason('');
    },
    onError: (error: any) => {
      console.error('Failed to block date:', error);
      toast({
        title: 'Failed to block date',
        description: error.message || 'Please try again',
        variant: 'destructive'
      });
    },
  });

  const removeDateMutation = useMutation({
    mutationFn: removeBlockedDate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockedDates'] });
      toast({ title: 'Date unblocked!' });
    },
    onError: (error: any) => {
      console.error('Failed to unblock date:', error);
      toast({
        title: 'Failed to unblock date',
        description: error.message || 'Please try again',
        variant: 'destructive'
      });
    },
  });

  const addTimeMutation = useMutation({
    mutationFn: ({ time, date }: { time: string; date: string }) =>
      addBlockedTime(time, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockedTimes'] });
      toast({ title: 'Time blocked successfully!' });
      setBlockTime('');
    },
    onError: (error: any) => {
      console.error('Failed to block time:', error);
      toast({
        title: 'Failed to block time',
        description: error.message || 'Please try again',
        variant: 'destructive'
      });
    },
  });

  const removeTimeMutation = useMutation({
    mutationFn: removeBlockedTime,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockedTimes'] });
      toast({ title: 'Time unblocked!' });
    },
    onError: (error: any) => {
      console.error('Failed to unblock time:', error);
      toast({
        title: 'Failed to unblock time',
        description: error.message || 'Please try again',
        variant: 'destructive'
      });
    },
  });

  const handleBlockDate = () => {
    if (!selectedDate) {
      toast({
        title: 'No date selected',
        description: 'Please select a date to block',
        variant: 'destructive'
      });
      return;
    }

    const dateStr = formatDateForInput(selectedDate);
    console.log('Blocking date:', dateStr, 'Selected date object:', selectedDate);
    addDateMutation.mutate({ date: dateStr, reason: blockReason });
  };

  const handleBlockTime = () => {
    console.log('handleBlockTime called, blockTime:', blockTime, 'selectedDate:', selectedDate);
    
    if (!selectedDate) {
      toast({
        title: 'No date selected',
        description: 'Please select a date to block the time slot for',
        variant: 'destructive'
      });
      return;
    }

    if (!blockTime) {
      toast({
        title: 'No time entered',
        description: 'Please enter a time to block',
        variant: 'destructive'
      });
      return;
    }

    const dateStr = formatDateForInput(selectedDate);
    console.log('Calling addTimeMutation with time:', blockTime, 'and date:', dateStr);
    addTimeMutation.mutate({ time: blockTime, date: dateStr });
  };

  return (
    <AdminLayout>
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Schedule Management</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Block Dates */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Block Dates</h2>
            
            <div className="mb-6">
              <Label className="mb-2 block">Select Date to Block</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date()}
                className="rounded-lg border"
              />
            </div>

            <div className="mb-4">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Input
                id="reason"
                value={blockReason}
                onChange={e => setBlockReason(e.target.value)}
                placeholder="e.g., Holiday, Vacation"
                className="mt-1"
              />
            </div>

            <Button
              onClick={handleBlockDate}
              disabled={!selectedDate || addDateMutation.isPending}
              className="w-full bg-gradient-to-r from-pink-500 to-pink-700 hover:from-pink-600 hover:to-pink-800 text-white"
            >
              <Plus className="mr-2" size={18} />
              {addDateMutation.isPending ? 'Blocking...' : 'Block Selected Date'}
            </Button>

            <div className="mt-6">
              <h3 className="font-semibold mb-3 text-gray-800">Blocked Dates</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {blockedDates?.map(blocked => (
                  <div
                    key={blocked.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-800">
                        {formatDate(blocked.date)}
                      </p>
                      {blocked.reason && (
                        <p className="text-sm text-gray-600">{blocked.reason}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeDateMutation.mutate(blocked.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
                {blockedDates?.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No blocked dates</p>
                )}
              </div>
            </div>
          </Card>

          {/* Block Times */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Block Times</h2>
            
            {!selectedDate && (
              <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                <p className="text-sm text-yellow-800">
                  💡 Please select a date from the calendar above first, then choose a time to block.
                </p>
              </div>
            )}
            
            <div className="mb-4">
              <Label htmlFor="time">Time to Block (HH:MM format)</Label>
              <Input
                id="time"
                type="time"
                value={blockTime}
                onChange={e => setBlockTime(e.target.value)}
                className="mt-1"
                disabled={!selectedDate}
              />
            </div>

            <Button
              onClick={handleBlockTime}
              disabled={!selectedDate || !blockTime || addTimeMutation.isPending}
              className="w-full bg-gradient-to-r from-pink-500 to-pink-700 hover:from-pink-600 hover:to-pink-800 text-white"
            >
              <Plus className="mr-2" size={18} />
              {addTimeMutation.isPending ? 'Blocking...' : 'Block Time Slot'}
            </Button>

            <div className="mt-6">
              <h3 className="font-semibold mb-3 text-gray-800">Blocked Times</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {blockedTimes?.map(blocked => (
                  <div
                    key={blocked.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-800">{formatTime12Hour(blocked.time)}</p>
                      {blocked.date && (
                        <p className="text-sm text-gray-600">
                          {formatDate(blocked.date)}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeTimeMutation.mutate(blocked.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
                {blockedTimes?.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No blocked times</p>
                )}
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Blocked times apply to all days unless a specific date is set.
                Customers won't be able to book these time slots.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSchedule;
