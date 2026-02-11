import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus, Clock, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { formatTime12Hour } from '@/utils/dateTime';

interface TimeSlot {
  id: string;
  time: string;
  enabled: boolean;
  duration_minutes: number;
}

const AdminTimeSlots = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newTimeSlot, setNewTimeSlot] = useState('');
  const [newDuration, setNewDuration] = useState(60);

  // Fetch current time slots
  const { data: timeSlots = [], isLoading } = useQuery<TimeSlot[]>({
    queryKey: ['admin-time-slots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_slots')
        .select('*')
        .order('time');
      
      if (error) {
        console.error('Error fetching time slots:', error);
        throw error;
      }
      
      return data || [];
    }
  });

  // Add new time slot mutation
  const addTimeSlotMutation = useMutation({
    mutationFn: async ({ time, duration }: { time: string; duration: number }) => {
      const { data, error } = await supabase
        .from('time_slots')
        .insert([{
          time,
          duration_minutes: duration,
          enabled: true
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-time-slots'] });
      setNewTimeSlot('');
      setNewDuration(60);
      toast({
        title: 'Time Slot Added',
        description: 'New time slot has been added successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add time slot',
        variant: 'destructive'
      });
    }
  });

  // Update time slot mutation
  const updateTimeSlotMutation = useMutation({
    mutationFn: async ({ id, enabled, duration }: { id: string; enabled?: boolean; duration?: number }) => {
      const updateData: any = {};
      if (enabled !== undefined) updateData.enabled = enabled;
      if (duration !== undefined) updateData.duration_minutes = duration;

      const { data, error } = await supabase
        .from('time_slots')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-time-slots'] });
      toast({
        title: 'Updated',
        description: 'Time slot has been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update time slot',
        variant: 'destructive'
      });
    }
  });

  // Delete time slot mutation
  const deleteTimeSlotMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('time_slots')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-time-slots'] });
      toast({
        title: 'Deleted',
        description: 'Time slot has been removed successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete time slot',
        variant: 'destructive'
      });
    }
  });

  const handleAddTimeSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTimeSlot) return;

    // Validate time format (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(newTimeSlot)) {
      toast({
        title: 'Invalid Time Format',
        description: 'Please use HH:MM format (e.g., 09:00, 14:30)',
        variant: 'destructive'
      });
      return;
    }

    addTimeSlotMutation.mutate({ 
      time: newTimeSlot, 
      duration: newDuration 
    });
  };

  const generateDefaultTimeSlots = async () => {
    const defaultTimes = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
      '15:00', '15:30', '16:00', '16:30', '17:00'
    ];

    try {
      for (const time of defaultTimes) {
        await addTimeSlotMutation.mutateAsync({ time, duration: 60 });
      }
      
      toast({
        title: 'Default Times Added',
        description: 'All default time slots have been created.',
      });
    } catch (error) {
      console.error('Error generating default time slots:', error);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Time Slots</h1>
            <p className="text-gray-600">Customize available appointment times and durations</p>
          </div>
          
          {timeSlots.length === 0 && (
            <Button onClick={generateDefaultTimeSlots} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Generate Default Times
            </Button>
          )}
        </div>

        {/* Add New Time Slot */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Add New Time Slot</h3>
          <form onSubmit={handleAddTimeSlot} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="time">Time (24-hour format)</Label>
                <Input
                  id="time"
                  type="time"
                  value={newTimeSlot}
                  onChange={(e) => setNewTimeSlot(e.target.value)}
                  placeholder="09:00"
                  className="mt-1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="15"
                  max="480"
                  step="15"
                  value={newDuration}
                  onChange={(e) => setNewDuration(parseInt(e.target.value))}
                  className="mt-1"
                  required
                />
              </div>
              
              <div className="flex items-end">
                <Button 
                  type="submit" 
                  disabled={addTimeSlotMutation.isPending}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Time Slot
                </Button>
              </div>
            </div>
          </form>
        </Card>

        {/* Current Time Slots */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Current Time Slots</h3>
          
          {timeSlots.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Clock className="mx-auto h-12 w-12 mb-4" />
              <p>No time slots configured yet.</p>
              <p>Add your first time slot or generate default times to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {timeSlots.map((slot) => (
                <div
                  key={slot.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    slot.enabled 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="font-mono text-lg font-semibold">
                      {formatTime12Hour(slot.time)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {slot.duration_minutes} minutes
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`enable-${slot.id}`} className="text-sm">
                        Enabled
                      </Label>
                      <Switch
                        id={`enable-${slot.id}`}
                        checked={slot.enabled}
                        onCheckedChange={(checked) =>
                          updateTimeSlotMutation.mutate({
                            id: slot.id,
                            enabled: checked
                          })
                        }
                      />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="15"
                        max="480"
                        step="15"
                        value={slot.duration_minutes}
                        onChange={(e) =>
                          updateTimeSlotMutation.mutate({
                            id: slot.id,
                            duration: parseInt(e.target.value)
                          })
                        }
                        className="w-20"
                      />
                      <span className="text-sm text-gray-500">min</span>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteTimeSlotMutation.mutate(slot.id)}
                      disabled={deleteTimeSlotMutation.isPending}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-2">💡 Pro Tips:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Adjust durations based on service complexity (e.g., 60 min for full sets, 30 min for touch-ups)</li>
            <li>• Disable time slots during lunch breaks or personal time</li>
            <li>• Use 15-minute intervals for maximum flexibility</li>
            <li>• Changes take effect immediately for new bookings</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminTimeSlots;