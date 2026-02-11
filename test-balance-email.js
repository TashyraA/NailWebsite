// Test script to verify balance payment email delivery
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://welrezlcsksigrqwfcme.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlbHJlemxjc2tzaWdycXdmY21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyNTE2MDIsImV4cCI6MjA1MzgyNzYwMn0.DGJJMNKTFhQf6qbPZfG6MK-w3fgLMBWFAZ1kkqWP4g8'; 

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSendEmail() {
  try {
    console.log('Testing send-email function...');
    
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: 'brianalehota@gmail.com',
        subject: 'Test Email - Balance Payment System',
        html: `
          <h1>Test Email</h1>
          <p>This is a test email to verify that the send-email function is working.</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
        `
      }
    });
    
    console.log('Send-email response:', { data, error });
    
    if (error) {
      console.error('❌ Send-email function failed:', error);
    } else {
      console.log('✅ Send-email function working!');
    }
    
  } catch (err) {
    console.error('❌ Test failed:', err);
  }
}

async function testBalancePaymentFunction() {
  try {
    console.log('Testing balance payment email function...');
    
    // Test with a mock Stripe session ID
    const { data, error } = await supabase.functions.invoke('send-balance-payment-emails', {
      body: {
        sessionId: 'cs_test_mock_session_id'
      }
    });
    
    console.log('Balance payment function response:', { data, error });
    
    if (error) {
      console.error('❌ Balance payment function failed:', error);
    } else {
      console.log('✅ Balance payment function responded!');
    }
    
  } catch (err) {
    console.error('❌ Balance payment test failed:', err);
  }
}

testSendEmail().then(() => testBalancePaymentFunction());