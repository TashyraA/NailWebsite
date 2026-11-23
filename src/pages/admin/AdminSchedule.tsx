
import React, { useState } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  CalendarDays,
  CalendarOff,
  Clock3,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

type WeeklySlot = {
  id: number;
  dayOfWeek: number;
  appointmentTime: string;
  isActive: boolean;
};

type ScheduleOverride = {
  id: number;
  overrideDate: string;
  appointmentTime: string;
  action: 'add' | 'remove';
};

type ScheduleBlock = {
  id: number;
  blockDate: string;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
};

type Reservation = {
  id: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  startsAt: string;
  endsAt: string;
};

type ScheduleResponse = {
  success: boolean;
  timezone: string;
  weekly: WeeklySlot[];
  overrides: ScheduleOverride[];
  blocks: ScheduleBlock[];
  reservations: Reservation[];
};

type ScheduleAction =
  | {
      action: 'weekly-set';
      dayOfWeek: number;
      appointmentTime: string;
      isActive: boolean;
    }
  | {
      action: 'override-set';
      overrideDate: string;
      appointmentTime: string;
      overrideAction: 'add' | 'remove';
    }
  | {
      action: 'override-delete';
      id: number;
    }
  | {
      action: 'block-add';
      blockDate: string;
      startTime: string | null;
      endTime: string | null;
      reason: string;
    }
  | {
      action: 'block-delete';
      id: number;
    };

const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function ohioDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const part = (type: string) =>
    parts.find(item => item.type === type)?.value ?? '';

  return `${part('year')}-${part('month')}-${part('day')}`;
}

function addDays(date: string, days: number): string {
  const result = new Date(`${date}T12:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatTime(time: string): string {
  const [hours, minutes] = time.slice(0, 5).split(':').map(Number);

  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${
    hours >= 12 ? 'PM' : 'AM'
  }`;
}

function minutes(time: string): number {
  const [hours, mins] = time.split(':').map(Number);
  return hours * 60 + mins;
}

function getDayOfWeek(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

async function readJson(response: Response) {
  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success) {
    throw new Error(
      typeof data?.error === 'string'
        ? data.error
        : 'Unable to complete the request.'
    );
  }

  return data;
}

async function getSchedule(
  startDate: string,
  endDate: string
): Promise<ScheduleResponse> {
  const params = new URLSearchParams({
    startDate,
    endDate,
  });

  const response = await fetch(
    `/api/admin-schedule?${params.toString()}`,
    {
      credentials: 'same-origin',
      cache: 'no-store',
    }
  );

  return readJson(response);
}

async function updateSchedule(
  payload: ScheduleAction
): Promise<void> {
  const response = await fetch('/api/admin-schedule', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  await readJson(response);
}

const AdminSchedule: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(
    () => ohioDate()
  );

  const [weeklyDay, setWeeklyDay] = useState(1);
  const [weeklyTime, setWeeklyTime] = useState('09:00');

  const [overrideTime, setOverrideTime] = useState('09:00');

  const [blockAllDay, setBlockAllDay] = useState(false);
  const [blockStart, setBlockStart] = useState('12:00');
  const [blockEnd, setBlockEnd] = useState('13:00');
  const [blockReason, setBlockReason] = useState('');

  // Fetch the selected date plus its surrounding month.
  // The API supports date ranges of up to 62 days.
  const startDate = addDays(selectedDate, -15);
  const endDate = addDays(selectedDate, 15);

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-schedule', startDate, endDate],
    queryFn: () => getSchedule(startDate, endDate),
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  });

  const mutation = useMutation({
    mutationFn: updateSchedule,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['admin-schedule'],
      });

      toast({
        title: 'Schedule updated!',
        description: 'Your change was saved successfully.',
      });
    },
    onError: (mutationError: Error) => {
      toast({
        title: 'Unable to update schedule',
        description: mutationError.message,
        variant: 'destructive',
      });
    },
  });

  const busy = mutation.isPending;

  const runAction = (action: ScheduleAction) => {
    if (busy) return;
    mutation.mutate(action);
  };

  const selectedDay = getDayOfWeek(selectedDate);

  const weeklySlots = (data?.weekly ?? [])
    .filter(slot => slot.dayOfWeek === selectedDay)
    .sort((a, b) =>
      a.appointmentTime.localeCompare(b.appointmentTime)
    );

  const dateOverrides = (data?.overrides ?? [])
    .filter(item => item.overrideDate === selectedDate);

  const dateBlocks = (data?.blocks ?? [])
    .filter(item => item.blockDate === selectedDate);

  const dateReservations = (data?.reservations ?? [])
    .filter(item => item.appointmentDate === selectedDate);

  const activeWeeklyTimes = new Set(
    weeklySlots
      .filter(slot => slot.isActive)
      .map(slot => slot.appointmentTime)
  );

  const overrideMap = new Map(
    dateOverrides.map(item => [
      item.appointmentTime,
      item.action,
    ])
  );

  const candidateTimes = Array.from(
    new Set([
      ...activeWeeklyTimes,
      ...dateOverrides.map(item => item.appointmentTime),
    ])
  )
    .filter(time => {
      const action = overrideMap.get(time);

      if (action === 'remove') return false;
      if (action === 'add') return true;

      return activeWeeklyTimes.has(time);
    })
    .sort();

  // This preview is informational. The public
  // availability endpoint will calculate exact
  // availability using service durations, blocks,
  // reservations, and booking notice.
  const isBlocked = (time: string) => {
    return dateBlocks.some(block => {
      if (!block.startTime || !block.endTime) {
        return true;
      }

      const slotStart = minutes(time);
      const blockStartMinutes = minutes(block.startTime);
      const blockEndMinutes = minutes(block.endTime);

      return (
        slotStart >= blockStartMinutes &&
        slotStart < blockEndMinutes
      );
    });
  };

  const isReserved = (time: string) => {
    return dateReservations.some(
      item => item.appointmentTime.slice(0, 5) === time
    );
  };

  const handleAddWeekly = () => {
    if (!TIME_PATTERN.test(weeklyTime)) {
      toast({
        title: 'Invalid time',
        description: 'Choose a valid appointment time.',
        variant: 'destructive',
      });
      return;
    }

    runAction({
      action: 'weekly-set',
      dayOfWeek: weeklyDay,
      appointmentTime: weeklyTime,
      isActive: true,
    });
  };

  const handleOverride = (
    overrideAction: 'add' | 'remove'
  ) => {
    if (!TIME_PATTERN.test(overrideTime)) {
      toast({
        title: 'Invalid time',
        description: 'Choose a valid appointment time.',
        variant: 'destructive',
      });
      return;
    }

    runAction({
      action: 'override-set',
      overrideDate: selectedDate,
      appointmentTime: overrideTime,
      overrideAction,
    });
  };

  const handleBlock = () => {
    if (
      !blockAllDay &&
      (
        !TIME_PATTERN.test(blockStart) ||
        !TIME_PATTERN.test(blockEnd) ||
        minutes(blockEnd) <= minutes(blockStart)
      )
    ) {
      toast({
        title: 'Invalid blocked period',
        description: 'End time must be later than start time.',
        variant: 'destructive',
      });
      return;
    }

    runAction({
      action: 'block-add',
      blockDate: selectedDate,
      startTime: blockAllDay ? null : blockStart,
      endTime: blockAllDay ? null : blockEnd,
      reason: blockReason.trim(),
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-7 pb-12">
        <section className="rounded-2xl border border-[#F0DCE3] bg-white px-5 py-7 shadow-sm sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="brand-eyebrow mb-2">
                Your Studio Workspace
              </p>

              <h1 className="font-heading text-3xl text-[#29252B] sm:text-4xl">
                Schedule Manager
              </h1>

              <p className="mt-2 text-sm text-[#786A72]">
                Manage weekly availability, special dates,
                and time off.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="border-[#EAC5D0] text-[#963F60]"
            >
              <RefreshCw
                size={16}
                className={`mr-2 ${
                  isFetching ? 'animate-spin' : ''
                }`}
              />
              Refresh
            </Button>
          </div>
        </section>

        <div className="rounded-xl border border-[#EAC5D0] bg-[#FFF7F8] px-4 py-3 text-xs leading-6 text-[#765E6B]">
          <ShieldCheck
            size={17}
            className="mr-2 inline text-[#963F60]"
          />
          Times are managed in Ohio time (Eastern).
          Existing approved appointments must be respected
          when changing availability.
        </div>

        {isLoading && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-xl bg-white p-5 text-sm text-[#765E6B]"
          >
            <Loader2 size={18} className="animate-spin" />
            Loading your schedule...
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
          >
            {error instanceof Error
              ? error.message
              : 'Unable to load schedule.'}
          </div>
        )}

        {data && (
          <>
            <Card className="brand-card p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <CalendarDays
                  size={22}
                  className="text-[#963F60]"
                />
                <div>
                  <h2 className="font-heading text-2xl text-[#29252B]">
                    Choose a Date
                  </h2>
                  <p className="text-xs text-[#96858E]">
                    View or customize a specific day.
                  </p>
                </div>
              </div>

              <Label htmlFor="schedule-date">
                Selected Date
              </Label>

              <Input
                id="schedule-date"
                type="date"
                value={selectedDate}
                onChange={event => {
                  if (event.target.value) {
                    setSelectedDate(event.target.value);
                  }
                }}
                className="mt-2 max-w-sm border-[#EAC5D0]"
              />

              <p className="mt-3 text-sm font-semibold text-[#963F60]">
                {formatDate(selectedDate)}
              </p>
            </Card>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Card className="brand-card p-5 sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <Clock3
                    size={22}
                    className="text-[#963F60]"
                  />
                  <h2 className="font-heading text-2xl text-[#29252B]">
                    Weekly Schedule
                  </h2>
                </div>

                <p className="mb-5 text-xs leading-6 text-[#786A72]">
                  These times repeat every week unless you
                  customize an individual date.
                </p>

                <div className="space-y-3">
                  {DAYS.map((day, dayIndex) => {
                    const slots = data.weekly
                      .filter(
                        slot =>
                          slot.dayOfWeek === dayIndex
                      )
                      .sort((a, b) =>
                        a.appointmentTime.localeCompare(
                          b.appointmentTime
                        )
                      );

                    return (
                      <div
                        key={day}
                        className="rounded-xl border border-[#F0DCE3] bg-[#FFFBFC] p-3"
                      >
                        <p className="mb-2 text-xs font-bold text-[#623848]">
                          {day}
                        </p>

                        {slots.length === 0 && (
                          <p className="text-xs text-[#96858E]">
                            No weekly times
                          </p>
                        )}

                        <div className="flex flex-wrap gap-2">
                          {slots.map(slot => (
                            <button
                              key={slot.id}
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                if (
                                  !window.confirm(
                                    `${slot.isActive ? 'Disable' : 'Enable'} ${formatTime(slot.appointmentTime)} every ${day}?`
                                  )
                                ) {
                                  return;
                                }

                                runAction({
                                  action: 'weekly-set',
                                  dayOfWeek: dayIndex,
                                  appointmentTime:
                                    slot.appointmentTime,
                                  isActive: !slot.isActive,
                                });
                              }}
                              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                                slot.isActive
                                  ? 'border-[#EAC5D0] bg-[#F7DDE4] text-[#963F60] hover:bg-[#EFCBD6]'
                                  : 'border-gray-200 bg-gray-100 text-gray-500 line-through hover:bg-gray-200'
                              }`}
                              title={
                                slot.isActive
                                  ? 'Click to disable'
                                  : 'Click to enable'
                              }
                            >
                              {formatTime(slot.appointmentTime)}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 border-t border-[#F0DCE3] pt-5">
                  <h3 className="mb-3 text-sm font-semibold text-[#29252B]">
                    Add a Weekly Time
                  </h3>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="weekly-day">Day</Label>
                      <select
                        id="weekly-day"
                        value={weeklyDay}
                        onChange={event =>
                          setWeeklyDay(Number(event.target.value))
                        }
                        className="mt-2 h-11 w-full rounded-lg border border-[#EAC5D0] bg-white px-3 text-sm"
                      >
                        {DAYS.map((day, index) => (
                          <option key={day} value={index}>
                            {day}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="weekly-time">Time</Label>
                      <Input
                        id="weekly-time"
                        type="time"
                        value={weeklyTime}
                        onChange={event =>
                          setWeeklyTime(event.target.value)
                        }
                        className="mt-2 border-[#EAC5D0]"
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={handleAddWeekly}
                    disabled={busy}
                    className="mt-4 bg-[#963F60] text-white hover:bg-[#79324F]"
                  >
                    <Plus size={17} className="mr-2" />
                    Add Weekly Time
                  </Button>
                </div>
              </Card>

              <div className="space-y-6">
                <Card className="brand-card p-5 sm:p-6">
                  <h2 className="font-heading text-2xl text-[#29252B]">
                    Selected Day
                  </h2>

                  <p className="mt-1 text-xs text-[#96858E]">
                    {formatDate(selectedDate)}
                  </p>

                  <div className="mt-5 space-y-2">
                    {candidateTimes.length === 0 && (
                      <p className="rounded-lg bg-[#FFF7F8] p-4 text-xs text-[#786A72]">
                        No scheduled appointment times.
                      </p>
                    )}

                    {candidateTimes.map(time => {
                      const reserved = isReserved(time);
                      const blocked = isBlocked(time);

                      return (
                        <div
                          key={time}
                          className="flex items-center justify-between gap-3 rounded-xl border border-[#F0DCE3] bg-[#FFFBFC] p-3"
                        >
                          <span className="text-sm font-semibold text-[#29252B]">
                            {formatTime(time)}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                              reserved
                                ? 'bg-[#EFF9F2] text-[#397A53]'
                                : blocked
                                  ? 'bg-[#FFF2DD] text-[#91641E]'
                                  : 'bg-[#F7DDE4] text-[#963F60]'
                            }`}
                          >
                            {reserved
                              ? 'Reserved'
                              : blocked
                                ? 'Blocked'
                                : 'Scheduled'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <p className="mt-4 text-xs leading-5 text-[#96858E]">
                    This is a schedule preview, not the final
                    customer availability calculation.
                  </p>
                </Card>

                <Card className="brand-card p-5 sm:p-6">
                  <h2 className="font-heading text-2xl text-[#29252B]">
                    Custom Times
                  </h2>

                  <p className="mt-2 text-xs leading-6 text-[#786A72]">
                    Add or remove a time for the selected date
                    without changing the weekly schedule.
                  </p>

                  <Label
                    htmlFor="override-time"
                    className="mt-4 block"
                  >
                    Appointment Time
                  </Label>

                  <Input
                    id="override-time"
                    type="time"
                    value={overrideTime}
                    onChange={event =>
                      setOverrideTime(event.target.value)
                    }
                    className="mt-2 border-[#EAC5D0]"
                  />

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      disabled={busy}
                      onClick={() => handleOverride('add')}
                      className="bg-[#963F60] text-white hover:bg-[#79324F]"
                    >
                      <Plus size={16} className="mr-2" />
                      Add Time
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Remove ${formatTime(overrideTime)} from ${formatDate(selectedDate)}?`
                          )
                        ) {
                          handleOverride('remove');
                        }
                      }}
                      className="border-[#EAC5D0] text-[#963F60]"
                    >
                      Remove Time
                    </Button>
                  </div>

                  {dateOverrides.length > 0 && (
                    <div className="mt-5 space-y-2">
                      <h3 className="text-xs font-semibold text-[#623848]">
                        Date Overrides
                      </h3>

                      {dateOverrides.map(item => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3 rounded-lg bg-[#FFF7F8] p-3"
                        >
                          <p className="text-xs text-[#623848]">
                            {formatTime(item.appointmentTime)}
                            {' · '}
                            {item.action === 'add'
                              ? 'Added'
                              : 'Removed'}
                          </p>

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            aria-label="Delete date override"
                            onClick={() => {
                              if (
                                window.confirm(
                                  'Restore this time to its normal weekly setting?'
                                )
                              ) {
                                runAction({
                                  action: 'override-delete',
                                  id: item.id,
                                });
                              }
                            }}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Card className="brand-card p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-3">
                  <CalendarOff
                    size={22}
                    className="text-[#963F60]"
                  />
                  <h2 className="font-heading text-2xl text-[#29252B]">
                    Block Time or Day
                  </h2>
                </div>

                <label className="flex items-center gap-3 text-sm text-[#623848]">
                  <input
                    type="checkbox"
                    checked={blockAllDay}
                    onChange={event =>
                      setBlockAllDay(event.target.checked)
                    }
                    className="h-4 w-4 accent-[#963F60]"
                  />
                  Block the entire selected day
                </label>

                {!blockAllDay && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="block-start">
                        Start Time
                      </Label>
                      <Input
                        id="block-start"
                        type="time"
                        value={blockStart}
                        onChange={event =>
                          setBlockStart(event.target.value)
                        }
                        className="mt-2 border-[#EAC5D0]"
                      />
                    </div>

                    <div>
                      <Label htmlFor="block-end">
                        End Time
                      </Label>
                      <Input
                        id="block-end"
                        type="time"
                        value={blockEnd}
                        onChange={event =>
                          setBlockEnd(event.target.value)
                        }
                        className="mt-2 border-[#EAC5D0]"
                      />
                    </div>
                  </div>
                )}

                <Label
                  htmlFor="block-reason"
                  className="mt-4 block"
                >
                  Reason (Optional)
                </Label>

                <Input
                  id="block-reason"
                  value={blockReason}
                  maxLength={250}
                  onChange={event =>
                    setBlockReason(event.target.value)
                  }
                  placeholder="Vacation, break, personal time..."
                  className="mt-2 border-[#EAC5D0]"
                />

                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Block ${
                          blockAllDay
                            ? 'the entire day'
                            : `${formatTime(blockStart)}–${formatTime(blockEnd)}`
                        } on ${formatDate(selectedDate)}?`
                      )
                    ) {
                      handleBlock();
                    }
                  }}
                  className="mt-4 bg-[#963F60] text-white hover:bg-[#79324F]"
                >
                  <CalendarOff size={16} className="mr-2" />
                  Save Block
                </Button>

                <div className="mt-6 space-y-2">
                  <h3 className="text-sm font-semibold text-[#29252B]">
                    Blocks for This Date
                  </h3>

                  {dateBlocks.length === 0 && (
                    <p className="text-xs text-[#96858E]">
                      No blocked periods.
                    </p>
                  )}

                  {dateBlocks.map(block => (
                    <div
                      key={block.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[#F0DCE3] bg-[#FFFBFC] p-3"
                    >
                      <div>
                        <p className="text-xs font-semibold text-[#623848]">
                          {block.startTime && block.endTime
                            ? `${formatTime(block.startTime)} – ${formatTime(block.endTime)}`
                            : 'Entire Day'}
                        </p>

                        {block.reason && (
                          <p className="mt-1 text-xs text-[#96858E]">
                            {block.reason}
                          </p>
                        )}
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        aria-label="Remove blocked period"
                        onClick={() => {
                          if (
                            window.confirm(
                              'Remove this blocked period?'
                            )
                          ) {
                            runAction({
                              action: 'block-delete',
                              id: block.id,
                            });
                          }
                        }}
                        className="text-[#963F60]"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="brand-card p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-3">
                  <ShieldCheck
                    size={22}
                    className="text-[#963F60]"
                  />
                  <h2 className="font-heading text-2xl text-[#29252B]">
                    Existing Reservations
                  </h2>
                </div>

                <p className="mb-4 text-xs leading-6 text-[#786A72]">
                  Approved appointments for the selected date.
                  These reservations take priority over
                  schedule changes.
                </p>

                {dateReservations.length === 0 && (
                  <p className="rounded-xl bg-[#FFF7F8] p-4 text-xs text-[#96858E]">
                    No approved reservations on this date.
                  </p>
                )}

                <div className="space-y-3">
                  {dateReservations.map(reservation => (
                    <div
                      key={reservation.id}
                      className="rounded-xl border border-[#D7E8DC] bg-[#F3FAF5] p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[#397A53]">
                          {formatTime(
                            reservation.appointmentTime
                          )}
                        </p>

                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#397A53]">
                          {reservation.status === 'confirmed'
                            ? 'Confirmed'
                            : 'Awaiting Deposit'}
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-[#61776A]">
                        Reserved appointment — manage it from
                        the Appointments page.
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminSchedule;
