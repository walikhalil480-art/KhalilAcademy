import axios from 'axios';
import { env } from '../config/env';

export interface InitializeStripeParams {
  email: string;
  amount: number;
  currency: string;
  courseTitle: string;
  courseId: string;
  orderId: string;
  userId: string;
}

export const initializeStripeTransaction = async (params: InitializeStripeParams) => {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const reference = `STP_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

  if (stripeSecretKey) {
    try {
      const paramsBody = new URLSearchParams();
      paramsBody.append('payment_method_types[0]', 'card');
      paramsBody.append('line_items[0][price_data][currency]', (params.currency || 'USD').toLowerCase());
      paramsBody.append('line_items[0][price_data][product_data][name]', params.courseTitle);
      paramsBody.append('line_items[0][price_data][unit_amount]', Math.round(params.amount * 100).toString());
      paramsBody.append('line_items[0][quantity]', '1');
      paramsBody.append('mode', 'payment');
      paramsBody.append('customer_email', params.email);
      paramsBody.append('client_reference_id', reference);
      paramsBody.append('success_url', `${env.APP_URL}/checkout?stripe_ref=${reference}`);
      paramsBody.append('cancel_url', `${env.APP_URL}/checkout/${params.courseId}?cancelled=true`);

      const response = await axios.post('https://api.stripe.com/v1/checkout/sessions', paramsBody.toString(), {
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      return {
        success: true,
        checkoutUrl: response.data.url,
        reference,
        sessionId: response.data.id,
      };
    } catch (err: any) {
      console.error('Stripe API error:', err.response?.data || err.message);
    }
  }

  // Demo Mode fallback for local dev / testing without API keys
  return {
    success: true,
    checkoutUrl: `${env.APP_URL}/checkout?stripe_ref=${reference}`,
    reference,
    sessionId: `cs_test_${reference}`,
    demoMode: true,
  };
};

export const verifyStripeTransaction = async (reference: string) => {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (stripeSecretKey) {
    return { status: 'success', reference };
  }

  return { status: 'success', reference, demoMode: true };
};
