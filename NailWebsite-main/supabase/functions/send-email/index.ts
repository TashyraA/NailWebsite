const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, html }: EmailRequest = await req.json();

    console.log('Sending email to:', to);
    console.log('Subject:', subject);

    // Get Resend API key from environment
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    
    console.log('RESEND_API_KEY exists:', !!RESEND_API_KEY);
    
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not found in environment variables');
      return new Response(
        JSON.stringify({ error: 'Email service not configured. Please add RESEND_API_KEY to Supabase secrets.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Send email via Resend API
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Briana <brianalehota@gmail.com>',
        to: [to],
        subject: subject,
        html: html
      })
    });

    const responseData = await res.json();
    console.log('Resend API response:', JSON.stringify(responseData));

    if (!res.ok) {
      console.error('Resend API error:', responseData);
      return new Response(
        JSON.stringify({ error: `Failed to send email: ${responseData.message || JSON.stringify(responseData)}` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('Email sent successfully:', responseData);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        emailId: responseData.id,
        to,
        subject
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error',
        details: 'Check Supabase Edge Function logs for more information'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
