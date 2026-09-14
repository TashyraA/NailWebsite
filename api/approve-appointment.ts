import { appUrl, verifyBooking } from './_booking';
import { createBalancePaymentLink } from './_balance-payment';
import { escapeHtml, sendEmail } from './_email';

export const config = { runtime: 'nodejs' };

export default async function handler(req: any, res: any) {
  const token = String(req.query?.token || '');
  const action = String(req.query?.action || 'approve');
  try {
    const booking = verifyBooking(token);
    const services = booking.services.map(item => `${item.service?.title || item.title || 'Nail service'} x${item.quantity || 1}`).join(', ');
    if (action === 'decline') {
      await sendEmail(booking.customerEmail, 'InLoveNailz appointment request update', `<h2>Appointment request update</h2><p>Hi ${escapeHtml(booking.customerName)}, we are unable to accept the requested appointment for ${escapeHtml(booking.appointmentDate)} at ${escapeHtml(booking.appointmentTime)}. Please reply to this email to choose another time.</p>`);
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send('<h1>Appointment declined</h1><p>The customer has been notified.</p>');
    }

    const paymentUrl = await createBalancePaymentLink({
      id: booking.id, customerName: booking.customerName, customerEmail: booking.customerEmail,
      appointmentDate: booking.appointmentDate, appointmentTime: booking.appointmentTime, services,
      totalPrice: booking.totalPrice, depositPaid: booking.depositPaid, balanceDue: booking.balanceDue
    }, token);
    await sendEmail(booking.customerEmail, 'Your InLoveNailz appointment is confirmed', `<h2>Appointment confirmed</h2><p>Hi ${escapeHtml(booking.customerName)}, your appointment is confirmed.</p><p><strong>${escapeHtml(booking.appointmentDate)} at ${escapeHtml(booking.appointmentTime)}</strong></p><p>Services: ${escapeHtml(services)}</p><p>Total: $${booking.totalPrice.toFixed(2)} | Deposit paid: $${booking.depositPaid.toFixed(2)} | Remaining balance: $${booking.balanceDue.toFixed(2)}</p>${paymentUrl ? `<p><a href="${paymentUrl}">Pay the remaining balance</a></p>` : '<p>Your appointment is paid in full.</p>'}`);
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(`<h1>Appointment approved</h1><p>${escapeHtml(booking.customerName)} has been emailed. <a href="${appUrl()}">Return to site</a></p>`);
  } catch (error: any) {
    return res.status(400).send(`<h1>Unable to process appointment</h1><p>${escapeHtml(error.message || 'Invalid approval link')}</p>`);
  }
}