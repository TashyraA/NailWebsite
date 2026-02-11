import { supabase } from '@/lib/supabase';

interface EmailData {
  to: string;
  customerName: string;
  appointmentDate: string;
  appointmentTime: string;
  services: any[];
  totalPrice: number;
  depositPaid: number;
  balanceDue: number;
  paymentLink?: string;
}

interface BusinessNotificationData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  appointmentDate: string;
  appointmentTime: string;
  services: any[];
  totalPrice: number;
  depositPaid: number;
  balanceDue: number;
  appointmentId: string;
}

// Email templates
const getBookingConfirmationEmail = (data: EmailData) => ({
  subject: '✨ Your Nail Appointment is Booked!',
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Cormorant Garamond', serif; background-color: #FFE9EF; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #FFBCCD, #FFC9D7); padding: 40px 20px; text-align: center; }
        .header h1 { color: #333; margin: 0; font-size: 32px; }
        .content { padding: 30px; color: #333; }
        .appointment-details { background: #FFE9EF; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #FF8CAA; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #FFC9D7; }
        .detail-label { font-weight: 600; color: #666; }
        .detail-value { color: #333; }
        .service-item { padding: 8px 0; }
        .total { font-size: 20px; font-weight: bold; color: #FF8CAA; margin-top: 15px; }
        .footer { background: #FFE9EF; padding: 20px; text-align: center; color: #666; font-size: 14px; }
        .button { display: inline-block; background: #FF8CAA; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Booking Confirmed!</h1>
        </div>
        <div class="content">
          <p>Hi ${data.customerName},</p>
          <p>Your nail appointment has been successfully booked! I'm so excited to make your nail dreams come true.</p>
          
          <div class="appointment-details">
            <h2 style="margin-top: 0; color: #FF8CAA;">Appointment Details</h2>
            <div class="detail-row">
              <span class="detail-label">Date:</span>
              <span class="detail-value">${data.appointmentDate}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Time:</span>
              <span class="detail-value">${data.appointmentTime}</span>
            </div>
            <div class="detail-row" style="border-bottom: none;">
              <span class="detail-label">Status:</span>
              <span class="detail-value" style="color: #FF8CAA; font-weight: 600;">Pending Confirmation</span>
            </div>
          </div>

          <h3 style="color: #FF8CAA;">Services Booked:</h3>
          ${(data.services && Array.isArray(data.services) ? data.services : []).map(item => {
            const service = item.service || item;
            return `
            <div class="service-item">
              • ${service.title || service.name || 'Service'} - $${service.price || 0}
            </div>
          `}).join('')}

          <div class="appointment-details">
            <div class="detail-row">
              <span class="detail-label">Total Amount:</span>
              <span class="detail-value">$${(data.totalPrice || 0).toFixed(2)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Deposit Paid:</span>
              <span class="detail-value" style="color: green;">$${(data.depositPaid || 0).toFixed(2)}</span>
            </div>
            <div class="detail-row" style="border-bottom: none;">
              <span class="detail-label total">Balance Due:</span>
              <span class="detail-value total">$${(data.balanceDue || 0).toFixed(2)}</span>
            </div>
          </div>

          <p><strong>What's Next?</strong></p>
          <ul>
            <li>I'll review your booking and send a confirmation shortly</li>
            <li>Please bring the balance due ($${data.balanceDue.toFixed(2)}) to your appointment</li>
            <li>Arrive on time to ensure you get the full experience</li>
          </ul>

          <p>If you have any questions or need to reschedule, please reply to this email or contact me directly.</p>
          
          <p>Looking forward to seeing you!</p>
          <p style="margin-top: 20px;"><strong>Briana</strong><br>Licensed Manicurist<br>Cleveland, OH</p>
        </div>
        <div class="footer">
          <p>📧 Contact: brianalehota@gmail.com</p>
          <p>Instagram: @briilovesnailz</p>
        </div>
      </div>
    </body>
    </html>
  `
});

const getConfirmedEmail = (data: EmailData) => ({
  subject: '✅ Your Appointment is Confirmed!',
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Cormorant Garamond', serif; background-color: #FFE9EF; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #10B981, #059669); padding: 40px 20px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 32px; }
        .content { padding: 30px; color: #333; }
        .appointment-details { background: #FFE9EF; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #10B981; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #FFC9D7; }
        .footer { background: #FFE9EF; padding: 20px; text-align: center; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Confirmed!</h1>
        </div>
        <div class="content">
          <p>Hi ${data.customerName},</p>
          <p><strong>Great news!</strong> Your appointment has been confirmed.</p>
          
          <div class="appointment-details">
            <h2 style="margin-top: 0; color: #10B981;">Confirmed Appointment</h2>
            <div class="detail-row">
              <span>Date:</span>
              <span>${data.appointmentDate}</span>
            </div>
            <div class="detail-row">
              <span>Time:</span>
              <span>${data.appointmentTime}</span>
            </div>
            <div class="detail-row" style="border-bottom: none;">
              <span>Balance Due:</span>
              <span style="font-weight: bold;">$${data.balanceDue.toFixed(2)}</span>
            </div>
          </div>

          ${data.paymentLink ? `
          <div style="text-align: center; margin: 25px 0;">
            <p style="margin-bottom: 15px;">Pay your remaining balance online:</p>
            <a href="${data.paymentLink}" style="display: inline-block; background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              💳 Pay $${data.balanceDue.toFixed(2)} Now
            </a>
            <p style="margin-top: 10px; font-size: 12px; color: #666;">Or pay in person at your appointment</p>
          </div>
          ` : ''}

          <p><strong>Reminders:</strong></p>
          <ul>
            <li>Please arrive on time</li>
            <li>Bring payment for the remaining balance</li>
            <li>If you need to reschedule, please contact me as soon as possible</li>
          </ul>

          <p>See you soon!</p>
          <p><strong>Briana</strong></p>
        </div>
        <div class="footer">
          <p>📧 brianalehota@gmail.com | Instagram: @briilovesnailz</p>
        </div>
      </div>
    </body>
    </html>
  `
});

const getCancelledEmail = (data: EmailData) => ({
  subject: '❌ Appointment Cancelled',
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Cormorant Garamond', serif; background-color: #FFE9EF; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #EF4444, #DC2626); padding: 40px 20px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 32px; }
        .content { padding: 30px; color: #333; }
        .footer { background: #FFE9EF; padding: 20px; text-align: center; color: #666; font-size: 14px; }
        .button { display: inline-block; background: #FF8CAA; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Appointment Cancelled</h1>
        </div>
        <div class="content">
          <p>Hi ${data.customerName},</p>
          <p>Your appointment scheduled for <strong>${data.appointmentDate} at ${data.appointmentTime}</strong> has been cancelled.</p>
          
          <p>If you'd like to reschedule or have any questions, please don't hesitate to reach out to me.</p>

          <p>I hope to see you soon!</p>
          <p><strong>Briana</strong></p>
        </div>
        <div class="footer">
          <p>📧 brianalehota@gmail.com | Instagram: @briilovesnailz</p>
        </div>
      </div>
    </body>
    </html>
  `
});

const getCompletedEmail = (data: EmailData) => ({
  subject: '💅 Thank You for Your Visit!',
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Cormorant Garamond', serif; background-color: #FFE9EF; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #FFBCCD, #FFC9D7); padding: 40px 20px; text-align: center; }
        .header h1 { color: #333; margin: 0; font-size: 32px; }
        .content { padding: 30px; color: #333; }
        .footer { background: #FFE9EF; padding: 20px; text-align: center; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💅 Thank You!</h1>
        </div>
        <div class="content">
          <p>Hi ${data.customerName},</p>
          <p>Thank you so much for choosing me for your nail care! It was wonderful working with you today.</p>
          
          <p>I hope you absolutely love your nails! 💖</p>

          <p><strong>Care Tips:</strong></p>
          <ul>
            <li>Avoid hot water for the first 24 hours</li>
            <li>Use cuticle oil daily to keep your nails healthy</li>
            <li>Wear gloves when doing dishes or cleaning</li>
          </ul>

          <p>I'd love to see you again! Book your next appointment anytime.</p>

          <p>Don't forget to follow me on Instagram <strong>@briilovesnailz</strong> and tag me in your nail photos!</p>
          
          <p>With love,<br><strong>Briana</strong></p>
        </div>
        <div class="footer">
          <p>📧 brianalehota@gmail.com | Instagram: @briilovesnailz</p>
        </div>
      </div>
    </body>
    </html>
  `
});

const getBalancePaymentEmail = (data: EmailData) => ({
  subject: '💳 Balance Payment Complete - Thank You!',
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Cormorant Garamond', serif; background-color: #FFE9EF; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #10B981, #059669); padding: 40px 20px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 32px; }
        .content { padding: 30px; color: #333; }
        .payment-details { background: #F0FDF4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #10B981; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #BBF7D0; }
        .detail-label { font-weight: 600; color: #666; }
        .detail-value { color: #333; }
        .amount { font-size: 24px; font-weight: bold; color: #10B981; text-align: center; margin: 20px 0; }
        .footer { background: #FFE9EF; padding: 20px; text-align: center; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💳 Payment Complete!</h1>
        </div>
        <div class="content">
          <p>Hi ${data.customerName},</p>
          <p><strong>Thank you!</strong> Your remaining balance has been paid successfully.</p>
          
          <div class="payment-details">
            <h2 style="margin-top: 0; color: #10B981;">Payment Confirmation</h2>
            <div class="detail-row">
              <span class="detail-label">Date:</span>
              <span class="detail-value">${data.appointmentDate}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Time:</span>
              <span class="detail-value">${data.appointmentTime}</span>
            </div>
            <div class="detail-row" style="border-bottom: none;">
              <span class="detail-label">Status:</span>
              <span class="detail-value" style="color: #10B981; font-weight: bold;">✅ Paid in Full</span>
            </div>
          </div>

          <div class="amount">
            Balance Paid: $${(data.balanceDue || 0).toFixed(2)}
          </div>

          <p><strong>You're all set!</strong> Your appointment is now fully paid. I'm looking forward to seeing you!</p>

          <p>If you have any questions or need to make any changes, please don't hesitate to reach out.</p>
          
          <p>See you soon!</p>
          <p><strong>Briana</strong><br>Licensed Manicurist<br>Cleveland, OH</p>
        </div>
        <div class="footer">
          <p>Instagram: @briilovesnailz</p>
        </div>
      </div>
    </body>
    </html>
  `
});

// Business owner notification email
const getBusinessNotificationEmail = (data: BusinessNotificationData) => ({
  subject: '🔔 New Appointment Booking - Action Required',
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Cormorant Garamond', serif; background-color: #FFE9EF; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #8B5CF6, #7C3AED); padding: 40px 20px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 32px; }
        .content { padding: 30px; color: #333; }
        .appointment-details { background: #F3E8FF; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #8B5CF6; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #E0E7FF; }
        .detail-label { font-weight: 600; color: #666; }
        .detail-value { color: #333; }
        .customer-info { background: #FFF7ED; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #F59E0B; }
        .action-buttons { text-align: center; margin: 30px 0; }
        .confirm-btn { display: inline-block; background: #10B981; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; margin: 0 10px; font-weight: bold; }
        .view-btn { display: inline-block; background: #6366F1; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; margin: 0 10px; font-weight: bold; }
        .service-item { padding: 8px 12px; background: white; margin: 5px 0; border-radius: 4px; border-left: 3px solid #8B5CF6; }
        .footer { background: #FFE9EF; padding: 20px; text-align: center; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 New Booking</h1>
        </div>
        <div class="content">
          <p><strong>Hey Briana!</strong></p>
          <p>You have a new appointment booking that needs your confirmation.</p>
          
          <div class="customer-info">
            <h3 style="margin-top: 0; color: #F59E0B;">Customer Details</h3>
            <p><strong>Name:</strong> ${data.customerName}</p>
            <p><strong>Email:</strong> ${data.customerEmail}</p>
            <p><strong>Phone:</strong> ${data.customerPhone}</p>
          </div>

          <div class="appointment-details">
            <h2 style="margin-top: 0; color: #8B5CF6;">Appointment Details</h2>
            <div class="detail-row">
              <span class="detail-label">Date:</span>
              <span class="detail-value">${data.appointmentDate}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Time:</span>
              <span class="detail-value">${data.appointmentTime}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Total Price:</span>
              <span class="detail-value">$${data.totalPrice.toFixed(2)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Deposit Paid:</span>
              <span class="detail-value">$${data.depositPaid.toFixed(2)}</span>
            </div>
            <div class="detail-row" style="border-bottom: none;">
              <span class="detail-label">Balance Due:</span>
              <span class="detail-value" style="font-weight: bold; color: #F59E0B;">$${data.balanceDue.toFixed(2)}</span>
            </div>
          </div>

          <div style="margin: 20px 0;">
            <h3 style="color: #8B5CF6;">Services Requested</h3>
            ${(data.services && Array.isArray(data.services) ? data.services : []).map(serviceItem => {
              // Handle different service data structures
              let service;
              if (typeof serviceItem === 'object' && serviceItem) {
                // Check if this is a cart item with nested service
                if (serviceItem.service) {
                  service = serviceItem.service;
                } else {
                  service = serviceItem;
                }
              } else {
                service = serviceItem;
              }
              
              return `
              <div class="service-item">
                <strong>${typeof service === 'object' && service ? (service.title || service.name || 'Service') : (service || 'Service')}</strong>
                ${typeof service === 'object' && service && service.price ? `- $${service.price}` : ''}
              </div>
              `;
            }).join('')}
          </div>

          <div class="action-buttons">
            <p style="margin-bottom: 20px;"><strong>Quick Actions:</strong></p>
            <a href="http://localhost:5173/admin/appointments" class="confirm-btn">
              ✅ View in Admin Panel
            </a>
            <a href="mailto:${data.customerEmail}?subject=Appointment%20Confirmation&body=Hi%20${data.customerName},%0A%0AYour%20appointment%20for%20${data.appointmentDate}%20at%20${data.appointmentTime}%20has%20been%20confirmed!" class="view-btn">
              📧 Reply to Customer
            </a>
          </div>

          <p style="background: #FFF7ED; padding: 15px; border-radius: 8px; border-left: 4px solid #F59E0B;">
            <strong>💡 Reminder:</strong> Don't forget to confirm this appointment in your admin panel to send a confirmation email to ${data.customerName}.
          </p>
        </div>
        <div class="footer">
          <p>📧 Appointment Management System | Booking ID: ${data.appointmentId}</p>
        </div>
      </div>
    </body>
    </html>
  `
});

// Send email function
export const sendAppointmentEmail = async (
  type: 'booking' | 'confirmed' | 'cancelled' | 'completed' | 'balance_payment',
  data: EmailData
) => {
  try {
    let emailTemplate;
    
    switch (type) {
      case 'booking':
        emailTemplate = getBookingConfirmationEmail(data);
        break;
      case 'confirmed':
        emailTemplate = getConfirmedEmail(data);
        break;
      case 'cancelled':
        emailTemplate = getCancelledEmail(data);
        break;
      case 'completed':
        emailTemplate = getCompletedEmail(data);
        break;
      case 'balance_payment':
        emailTemplate = getBalancePaymentEmail(data);
        break;
      default:
        throw new Error('Invalid email type');
    }

    // Call Supabase Edge Function to send email
    const { data: result, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: data.to,
        subject: emailTemplate.subject,
        html: emailTemplate.html
      }
    });

    if (error) {
      console.error('Error sending email:', error);
      throw error;
    }

    console.log('Email sent successfully:', result);
    return result;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
};

// Send business notification email
export const sendBusinessNotificationEmail = async (data: BusinessNotificationData) => {
  try {
    console.log('Sending business notification email:', data);

    const emailTemplate = getBusinessNotificationEmail(data);

    const { data: result, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: 'brianalehota@gmail.com', // Your business email
        subject: emailTemplate.subject,
        html: emailTemplate.html
      }
    });

    if (error) {
      console.error('Error sending business notification:', error);
      throw error;
    }

    console.log('Business notification sent successfully:', result);
    return result;
  } catch (error) {
    console.error('Failed to send business notification:', error);
    throw error;
  }
};
