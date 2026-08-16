import crypto from 'crypto';

interface CreatePaymentIntentParams {
  amount: number; // in centavos (e.g. 10000 = ₱100.00)
  description: string;
  orderId: string;
  paymentMethods?: string[]; // ['gcash', 'paymaya', 'card', 'dob', 'qrph']
}

interface PayMongoPaymentIntent {
  id: string;
  type: string;
  attributes: {
    amount: number;
    currency: string;
    description: string;
    status: 'awaiting_payment_method' | 'awaiting_next_action' | 'processing' | 'succeeded' | 'cancelled';
    client_key: string;
    payment_method_allowed: string[];
    next_action?: {
      type: string;
      redirect?: {
        url: string;
        return_url: string;
      };
    } | null;
  };
}

const PAYMONGO_API_BASE = 'https://api.paymongo.com/v1';

/**
 * Checks if production/live PayMongo credentials are configured.
 */
export function isPayMongoConfigured(): boolean {
  const secret = process.env.PAYMONGO_SECRET_KEY;
  return Boolean(secret && secret.startsWith('sk_') && !secret.includes('placeholder'));
}

/**
 * Create a PayMongo Payment Intent.
 * If credentials are not present, generates a sandbox-compatible simulated intent.
 */
export async function createPaymentIntent(params: CreatePaymentIntentParams): Promise<PayMongoPaymentIntent> {
  const { amount, description, orderId, paymentMethods = ['gcash', 'paymaya', 'card'] } = params;

  if (isPayMongoConfigured()) {
    const secretKey = process.env.PAYMONGO_SECRET_KEY!;
    const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;

    const res = await fetch(`${PAYMONGO_API_BASE}/payment_intents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount,
            payment_method_allowed: paymentMethods,
            currency: 'PHP',
            description,
            statement_descriptor: 'WashGo Laundry',
            metadata: {
              order_id: orderId,
            },
          },
        },
      }),
    });

    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      console.error('PayMongo API Error:', errorJson);
      throw new Error(errorJson?.errors?.[0]?.detail || 'Failed to create PayMongo payment intent');
    }

    const json = await res.json();
    return json.data;
  }

  // Simulated Payment Intent for development / sandbox without requiring active keys
  const simulatedId = `pi_sim_${crypto.randomBytes(12).toString('hex')}`;
  const clientKey = `pi_client_${crypto.randomBytes(16).toString('hex')}`;

  return {
    id: simulatedId,
    type: 'payment_intent',
    attributes: {
      amount,
      currency: 'PHP',
      description,
      status: 'awaiting_payment_method',
      client_key: clientKey,
      payment_method_allowed: paymentMethods,
      next_action: null,
    },
  };
}

/**
 * Refund a PayMongo Payment.
 * If credentials are not present, generates a simulated refund success.
 */
export async function refundPayment(params: {
  paymentId: string;
  amountInCents?: number;
  reason?: string;
}): Promise<{ id: string; status: string; amount?: number }> {
  const { paymentId, amountInCents, reason = 'Order cancelled' } = params;

  if (isPayMongoConfigured() && !paymentId.startsWith('pi_sim_') && !paymentId.startsWith('pay_sim_')) {
    const secretKey = process.env.PAYMONGO_SECRET_KEY!;
    const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;

    const bodyData: any = {
      attributes: {
        payment_id: paymentId,
        reason: 'others',
        notes: reason,
      },
    };
    if (amountInCents) bodyData.attributes.amount = amountInCents;

    const res = await fetch(`${PAYMONGO_API_BASE}/refunds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({ data: bodyData }),
    });

    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      console.error('PayMongo Refund Error:', errorJson);
      throw new Error(errorJson?.errors?.[0]?.detail || 'Failed to process PayMongo refund');
    }

    const json = await res.json();
    return {
      id: json.data?.id,
      status: json.data?.attributes?.status || 'succeeded',
      amount: json.data?.attributes?.amount,
    };
  }

  // Simulated refund for sandbox/dev
  const simulatedRefundId = `ref_sim_${crypto.randomBytes(12).toString('hex')}`;
  return {
    id: simulatedRefundId,
    status: 'succeeded',
    amount: amountInCents,
  };
}

/**
 * Verify PayMongo webhook signature using HMAC-SHA256.
 */
export function verifyWebhookSignature(payload: string, signatureHeader: string, signatureKey: string): boolean {
  try {
    if (!signatureHeader || !signatureKey) return false;

    // Header format: t=1614749293,te=...,li=...
    const parts = signatureHeader.split(',');
    let timestamp = '';
    let testModeSignature = '';
    let liveModeSignature = '';

    for (const part of parts) {
      const [k, v] = part.trim().split('=');
      if (k === 't') timestamp = v;
      if (k === 'te') testModeSignature = v;
      if (k === 'li') liveModeSignature = v;
    }

    if (!timestamp) return false;

    const signatureToVerify = liveModeSignature || testModeSignature;
    if (!signatureToVerify) return false;

    const comparisonString = `${timestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', signatureKey)
      .update(comparisonString)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signatureToVerify));
  } catch (err) {
    console.error('Webhook signature verification error:', err);
    return false;
  }
}
