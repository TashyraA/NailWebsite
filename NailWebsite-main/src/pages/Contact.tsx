import React, { useState } from 'react';
import { Mail, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

const Contact = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      console.log('Contact form submitted:', formData);

      // Create contact email HTML
      const contactEmailHtml = `
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
              <h1>💌 New Contact Message</h1>
            </div>
            <div class="content">
              <h2 style="color: #FF8CAA; margin-top: 0;">Contact Details</h2>
              <p><strong>Name:</strong> ${formData.name}</p>
              <p><strong>Email:</strong> ${formData.email}</p>
              ${formData.phone ? `<p><strong>Phone:</strong> ${formData.phone}</p>` : ''}
              
              <h3 style="color: #FF8CAA;">Message:</h3>
              <div style="background: #FFE9EF; padding: 20px; border-radius: 8px; border-left: 4px solid #FF8CAA;">
                <p style="margin: 0;">${formData.message.replace(/\n/g, '<br>')}</p>
              </div>
              
              <p style="margin-top: 20px;">
                <strong>Reply to:</strong> 
                <a href="mailto:${formData.email}?subject=Re: Your message to InLoveNailz" style="color: #FF8CAA;">${formData.email}</a>
              </p>
            </div>
            <div class="footer">
              <p>This message was sent from the InLoveNailz contact form</p>
              <p>📧 <a href="https://inlovenailz.com" style="color: #FF8CAA;">inlovenailz.com</a></p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Send email via Supabase function
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: 'brianalehota@gmail.com',
          subject: `💌 New Contact Message from ${formData.name}`,
          html: contactEmailHtml
        }
      });

      if (error) {
        console.error('Failed to send contact email:', error);
        toast({
          title: 'Error sending message',
          description: 'There was a problem sending your message. Please try again or contact us directly.',
          variant: 'destructive'
        });
        return;
      }

      console.log('Contact email sent successfully:', data);

      toast({
        title: 'Message sent!',
        description: "We'll get back to you as soon as possible.",
      });

      setFormData({ name: '', email: '', phone: '', message: '' });
    } catch (error) {
      console.error('Contact form submission error:', error);
      toast({
        title: 'Error sending message',
        description: 'There was a problem sending your message. Please try again or contact us directly.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFE9EF] via-[#FFC9D7] to-[#FFBCCD]">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-800">
            Get In Touch
          </h1>
          <p className="text-gray-700 text-lg max-w-2xl mx-auto">
            Have questions? I'd love to hear from you. Send me a message and I'll respond as soon as possible.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Send me a Message</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="name">Your Name *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Jane Smith"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="jane@example.com"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="message">Your Message *</Label>
                <Textarea
                  id="message"
                  required
                  value={formData.message}
                  onChange={e => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Tell me how I can help you..."
                  className="mt-1"
                  rows={6}
                />
              </div>

                            <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#FF8CAA] hover:bg-[#FF6B96] text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                size="lg"
              >
                {isSubmitting ? 'Sending...' : (
                  <>
                    <Send className="mr-2" size={20} />
                    Send Message
                  </>
                )}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Contact;
