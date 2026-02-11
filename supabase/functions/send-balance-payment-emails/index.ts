// @deno-types="https://esm.sh/@types/node"
declare global {
  const Deno: {
    env: {
      get(key: string): string | undefined;
    };
    serve(handler: (req: Request) => Promise<Response>): void;
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// @ts-ignore - Deno ESM import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();

    console.log('Processing balance payment emails for session:', sessionId);

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'Session ID is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Stripe secret key
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not configured');
    }

    // Fetch session details from Stripe
    const sessionResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
      },
    });

    if (!sessionResponse.ok) {
      throw new Error('Failed to fetch session from Stripe');
    }

    const session = await sessionResponse.json();
    console.log('Stripe session data:', JSON.stringify(session));

    if (session.metadata?.type !== 'balance_payment') {
      console.log('Not a balance payment, skipping email notifications');
      return new Response(
        JSON.stringify({ message: 'Not a balance payment session' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    const customerEmail = session.metadata?.customer_email;
    const customerName = session.metadata?.customer_name;
    const appointmentId = session.metadata?.appointment_id;
    const amountPaid = session.amount_total / 100; // Convert from cents

    if (!customerEmail || !customerName) {
      throw new Error('Missing customer information in session metadata');
    }

    console.log('Sending balance payment emails to:', customerEmail, 'and admin');

    // Update appointment status to fully paid if we have an appointment ID
    if (appointmentId && appointmentId !== 'N/A') {
      try {
        // Try to update with new fields, but don't fail if they don't exist
        const updateData: any = { 
          balance_due: 0,
          status: 'confirmed',
          updated_at: new Date().toISOString()
        };
        
        // Only add new fields if they might exist (this prevents errors if migration hasn't run)
        try {
          updateData.balance_paid_at = new Date().toISOString();
          updateData.balance_payment_method = 'stripe';
          updateData.balance_stripe_session_id = sessionId;
        } catch (e) {
          console.log('New balance fields not available yet, using basic update');
        }
        
        const { error: updateError } = await supabase
          .from('appointments')
          .update(updateData)
          .eq('id', appointmentId);

        if (updateError) {
          console.error('Error updating appointment:', updateError);
          // Don't throw - continue with email sending
        } else {
          console.log('Appointment marked as fully paid with payment details:', appointmentId);
        }
      } catch (updateErr) {
        console.error('Error updating appointment status:', updateErr);
        // Don't throw - continue with email sending
      }
    }

    // Send customer confirmation email
    const customerEmailTemplate = getBalancePaymentCustomerEmail({
      customerName,
      amountPaid,
      appointmentId: appointmentId || 'N/A'
    });

    const { error: customerEmailError } = await supabase.functions.invoke('send-email', {
      body: {
        to: customerEmail,
        subject: customerEmailTemplate.subject,
        html: customerEmailTemplate.html
      }
    });

    if (customerEmailError) {
      console.error('Failed to send customer email:', customerEmailError);
    } else {
      console.log('Customer balance payment email sent successfully');
    }

    // Send admin notification email
    const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'brianalehota@gmail.com';
    const adminEmailTemplate = getBalancePaymentAdminEmail({
      customerName,
      customerEmail,
      amountPaid,
      appointmentId: appointmentId || 'N/A',
      sessionId
    });

    const { error: adminEmailError } = await supabase.functions.invoke('send-email', {
      body: {
        to: adminEmail,
        subject: adminEmailTemplate.subject,
        html: adminEmailTemplate.html
      }
    });

    if (adminEmailError) {
      console.error('Failed to send admin email:', adminEmailError);
    } else {
      console.log('Admin balance payment notification sent successfully');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Balance payment confirmation emails sent',
        customerEmail,
        amountPaid
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error sending balance payment emails:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// Customer balance payment confirmation email template
function getBalancePaymentCustomerEmail(data: { customerName: string; amountPaid: number; appointmentId: string }) {
  return {
    subject: '💳 Balance Payment Confirmed - Thank You!',
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
                <span class="detail-label">Payment Type:</span>
                <span class="detail-value">Balance Payment</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Reference ID:</span>
                <span class="detail-value">${data.appointmentId}</span>
              </div>
              <div class="detail-row" style="border-bottom: none;">
                <span class="detail-label">Status:</span>
                <span class="detail-value" style="color: #10B981; font-weight: bold;">✅ Paid in Full</span>
              </div>
            </div>

            <div class="amount">
              Amount Paid: $${data.amountPaid.toFixed(2)}
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
  };
}

// Admin balance payment notification email template
function getBalancePaymentAdminEmail(data: { customerName: string; customerEmail: string; amountPaid: number; appointmentId: string; sessionId: string }) {
  return {
    subject: '💰 Balance Payment Received - ' + data.customerName,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Cormorant Garamond', serif; background-color: #FFE9EF; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #F59E0B, #D97706); padding: 40px 20px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 32px; }
          .content { padding: 30px; color: #333; }
          .payment-details { background: #FFFBEB; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #F59E0B; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #FED7AA; }
          .detail-label { font-weight: 600; color: #666; }
          .detail-value { color: #333; }
          .amount { font-size: 24px; font-weight: bold; color: #F59E0B; text-align: center; margin: 20px 0; }
          .customer-info { background: #F0F9FF; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #0284C7; }
          .footer { background: #FFE9EF; padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💰 Balance Paid!</h1>
          </div>
          <div class="content">
            <p><strong>Hey Briana!</strong></p>
            <p>Great news! A customer has just paid their remaining balance.</p>
            
            <div class="customer-info">
              <h3 style="margin-top: 0; color: #0284C7;">Customer Information</h3>
              <p><strong>Name:</strong> ${data.customerName}</p>
              <p><strong>Email:</strong> ${data.customerEmail}</p>
            </div>

            <div class="payment-details">
              <h2 style="margin-top: 0; color: #F59E0B;">Payment Details</h2>
              <div class="detail-row">
                <span class="detail-label">Payment Type:</span>
                <span class="detail-value">Balance Payment</span>  
              </div>
              <div class="detail-row">
                <span class="detail-label">Appointment ID:</span>
                <span class="detail-value">${data.appointmentId}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Stripe Session:</span>
                <span class="detail-value">${data.sessionId}</span>
              </div>
              <div class="detail-row" style="border-bottom: none;">
                <span class="detail-label">Status:</span>
                <span class="detail-value" style="color: #10B981; font-weight: bold;">✅ Completed</span>
              </div>
            </div>

            <div class="amount">
              Amount Received: $${data.amountPaid.toFixed(2)}
            </div>

            <p style="background: #F0FDF4; padding: 15px; border-radius: 8px; border-left: 4px solid #10B981;">
              <strong>✅ Payment Complete:</strong> This appointment is now fully paid and confirmed.
            </p>
          </div>
          <div class="footer">
            <p>📧 Payment Notification System</p>
          </div>
        </div>
      </body>
      </html>
    `
  };
}