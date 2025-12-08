# Sdk for event api
```javascript 
import { Eventop } from '@eventop/sdk';

// Initialize client
const eventop = new Eventop({
  apiKey: process.env.EVENTOP_API_KEY!, // sk_test_... or sk_live_...
  // environment auto-detected from key prefix
});

// Create checkout session
const session = await eventop.checkout.create({
  planId: 'premium-monthly',
  customerEmail: 'user@example.com',
  customerId: 'user_123',
  successUrl: 'https://yourdomain.com/success',
  cancelUrl: 'https://yourdomain.com/pricing',
  metadata: {
    userId: '123',
    source: 'web',
  },
});

console.log('Checkout URL:', session.url);

// Verify webhook
app.post('/webhooks/eventop', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-webhook-signature'] as string;
  const payload = req.body.toString();

  try {
    const event = eventop.webhooks.constructEvent(
      payload,
      signature,
      process.env.WEBHOOK_SECRET!,
    );

    console.log('Received event:', event.event);
    res.json({ received: true });
  } catch (err) {
    res.status(400).send('Webhook signature verification failed');
  }
});
```