import React, { useMemo, useState } from 'react';
import { CalendarCheck2, Clock3, CreditCard, ShieldCheck } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { formatDateForBooking, formatTime, getAvailableTimes } from '@/utils/availability';

const BookAppointment = () => {
  const { items, getTotalPrice, getTotalDeposit } = useCart();
  const { toast } = useToast();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' });
  const selectedDate = date ? new Date(`${date}T12:00:00`) : undefined;
  const availableTimes = useMemo(() => selectedDate ? getAvailableTimes(selectedDate) : [], [selectedDate]);
  const total = getTotalPrice();
  const deposit = getTotalDeposit();
  const balance = Math.max(0, total - deposit);
  const updateForm = (field: keyof typeof form, value: string) => setForm(current => ({ ...current, [field]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!date || !time || !form.name || !form.email || !form.phone) {
      toast({ title: 'Complete your booking details', description: 'Choose a time and enter your name, email, and phone number.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/create-deposit-session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, appointmentDate: date, appointmentTime: time, services: items, totalPrice: total, depositPaid: deposit, balanceDue: balance })
      });
      const responseText = await response.text();
      let result: { url?: string; error?: string };
      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(responseText || `Server returned ${response.status}`);
      }
      if (!response.ok || !result.url) throw new Error(result.error || 'Unable to start secure payment');
      window.location.assign(result.url);
    } catch (error: any) {
      toast({ title: 'Payment could not start', description: error.message, variant: 'destructive' });
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) return <div className="min-h-screen bg-[#FFE9EF] p-12 text-center text-gray-700">Add a service to your cart before booking.</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFE9EF] via-[#FFC9D7] to-[#FFBCCD]">
      <div className="container mx-auto max-w-6xl px-4 py-12 md:py-16">
        <div className="mx-auto mb-10 max-w-3xl text-center"><p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#B74461]">InLoveNailz</p><h1 className="mb-4 text-4xl font-bold text-gray-800 md:text-5xl">Book your appointment</h1><p className="text-lg text-gray-700">Choose a time, enter your details, and pay the $20 deposit securely.</p></div>
        <div className="grid gap-8 lg:grid-cols-[1fr_1.35fr]">
          <div className="space-y-6">
            <Card className="p-6"><h2 className="mb-4 text-xl font-bold text-gray-800">Your services</h2><div className="space-y-3 border-b border-[#FFC9D7] pb-4">{items.map(({ service, quantity }) => <div key={service.id} className="flex justify-between gap-4 text-gray-700"><span>{service.title} x{quantity}</span><strong>${(service.price * quantity).toFixed(2)}</strong></div>)}</div><div className="mt-4 space-y-2 text-sm"><div className="flex justify-between"><span>Total</span><strong>${total.toFixed(2)}</strong></div><div className="flex justify-between text-[#D65E7B]"><span>Deposit due now</span><strong>${deposit.toFixed(2)}</strong></div><div className="flex justify-between"><span>Remaining balance</span><strong>${balance.toFixed(2)}</strong></div></div></Card>
            <Card className="p-6"><h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-800"><CalendarCheck2 className="text-[#FF8CAA]" size={22} /> Choose a day and time</h2><Label htmlFor="appointment-date">Date</Label><Input id="appointment-date" type="date" value={date} min={formatDateForBooking(new Date(Date.now() + 24 * 60 * 60 * 1000))} onChange={event => { setDate(event.target.value); setTime(''); }} className="mb-5 mt-1" /><Label><Clock3 className="mr-1 inline" size={16} /> Available times</Label><div className="mt-2 grid grid-cols-2 gap-2">{availableTimes.length ? availableTimes.map(slot => <button key={slot} type="button" onClick={() => setTime(slot)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${time === slot ? 'bg-[#FF8CAA] text-white' : 'bg-[#FFE9EF] text-gray-700 hover:bg-[#FFC9D7]'}`}>{formatTime(slot)}</button>) : <p className="col-span-2 text-sm text-gray-500">Choose a weekday to see available times.</p>}</div>{date && time && <p className="mt-4 rounded-lg bg-[#FFE9EF] p-3 text-sm text-gray-700">Selected: {selectedDate?.toLocaleDateString()} at {formatTime(time)}</p>}</Card>
          </div>
          <Card className="p-6"><h2 className="mb-4 text-xl font-bold text-gray-800">Your contact details</h2><form onSubmit={handleSubmit} className="space-y-4"><div><Label htmlFor="name">Full name</Label><Input id="name" value={form.name} onChange={event => updateForm('name', event.target.value)} required /></div><div><Label htmlFor="email">Email</Label><Input id="email" type="email" value={form.email} onChange={event => updateForm('email', event.target.value)} required /></div><div><Label htmlFor="phone">Phone</Label><Input id="phone" type="tel" value={form.phone} onChange={event => updateForm('phone', event.target.value)} required /></div><div><Label htmlFor="notes">Notes</Label><Textarea id="notes" value={form.notes} onChange={event => updateForm('notes', event.target.value)} rows={4} /></div><div className="rounded-xl bg-[#FFE9EF] p-4 text-sm text-gray-700"><p className="flex items-center gap-2"><ShieldCheck className="text-green-600" size={18} /> Your $20 deposit is processed securely by Stripe.</p><p className="mt-2">Your appointment remains pending until the nail tech approves it.</p></div><Button type="submit" disabled={isSubmitting} className="w-full bg-[#FF8CAA] py-6 text-white hover:bg-[#FF6B96]"><CreditCard className="mr-2" size={18} />{isSubmitting ? 'Opening secure payment...' : `Pay $${deposit.toFixed(2)} deposit`}</Button></form></Card>
        </div>
      </div>
    </div>
  );
};

export default BookAppointment;
