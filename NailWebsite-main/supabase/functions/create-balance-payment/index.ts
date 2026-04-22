// @ts-nocheck
// Deno Edge Function for creating balance payment checkout sessions

const balancePaymentCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: balancePaymentCorsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Stripe secret key not configured' }),
        {
          headers: { ...balancePaymentCorsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const { amount, customerEmail, customerName, appointmentId } = await req.json();

    console.log('Creating balance payment link:', { amount, customerEmail, customerName, appointmentId });

    if (!amount || !customerEmail || !customerName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          headers: { ...balancePaymentCorsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Create a Stripe Checkout Session for the balance payment
    const baseUrl = Deno.env.get('APP_URL') || 'http://localhost:5173';
    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('success_url', `${baseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}&type=balance`);
    params.append('cancel_url', `${baseUrl}/`);
    params.append('customer_email', customerEmail);
    params.append('line_items[0][price_data][currency]', 'usd');
    params.append('line_items[0][price_data][product_data][name]', `Remaining Balance - ${customerName}`);
    params.append('line_items[0][price_data][product_data][description]', 'Balance payment for nail appointment');
    params.append('line_items[0][price_data][unit_amount]', Math.round(amount * 100).toString());
    params.append('line_items[0][quantity]', '1');
    params.append('metadata[type]', 'balance_payment');
    params.append('metadata[appointment_id]', appointmentId || '');
    params.append('metadata[customer_name]', customerName);
    params.append('metadata[customer_email]', customerEmail);

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    const session = await response.json();
    console.log('Stripe session response:', JSON.stringify(session));

    if (!response.ok) {
      console.error('Stripe API error:', session);
      return new Response(
        JSON.stringify({ error: session.error?.message || 'Failed to create payment link' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('Payment link created:', session.url);

    return new Response(
      JSON.stringify({
        paymentUrl: session.url,
        sessionId: session.id,
      }),
      {
        headers: { ...balancePaymentCorsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error creating payment link:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...balancePaymentCorsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
