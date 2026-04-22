const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    
    console.log('STRIPE_SECRET_KEY exists:', !!stripeSecretKey);
    console.log('STRIPE_SECRET_KEY starts with:', stripeSecretKey?.substring(0, 10));
    
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Stripe secret key not configured. Please add STRIPE_SECRET_KEY to Supabase Edge Function secrets.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const requestBody = await req.json();
    console.log('Request body:', JSON.stringify(requestBody));
    
    const { amount, customerEmail, customerName, appointmentData } = requestBody;

    if (!amount || !customerEmail || !customerName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: amount, customerEmail, or customerName' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('Creating payment intent:', { amount, customerEmail, customerName });

    // Build the request body safely
    const params = new URLSearchParams();
    params.append('amount', Math.round(amount * 100).toString());
    params.append('currency', 'usd');
    params.append('receipt_email', customerEmail);
    params.append('description', `Deposit for nail appointment - ${customerName}`);
    params.append('metadata[customer_name]', customerName);
    params.append('metadata[customer_email]', customerEmail);
    
    if (appointmentData?.appointmentDate) {
      params.append('metadata[appointment_date]', appointmentData.appointmentDate);
    }
    if (appointmentData?.appointmentTime) {
      params.append('metadata[appointment_time]', appointmentData.appointmentTime);
    }
    if (appointmentData?.services) {
      params.append('metadata[services]', JSON.stringify(appointmentData.services).substring(0, 500));
    }
    if (appointmentData?.totalPrice) {
      params.append('metadata[total_price]', appointmentData.totalPrice.toString());
    }

    console.log('Calling Stripe API...');

    // Use Stripe REST API directly instead of the SDK
    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    const paymentIntent = await response.json();
    console.log('Stripe response status:', response.status);
    console.log('Stripe response:', JSON.stringify(paymentIntent));

    if (!response.ok) {
      console.error('Stripe API error:', paymentIntent);
      return new Response(
        JSON.stringify({ error: paymentIntent.error?.message || 'Stripe API error' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('Payment intent created:', paymentIntent.id);

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error creating payment intent:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
