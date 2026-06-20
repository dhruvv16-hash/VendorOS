import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { rateLimit } from '../../../../lib/rateLimiter';

export async function POST(request: Request) {
  try {
    // Rate Limiting Check: 30 requests per minute
    const rateLimitResult = await rateLimit(request, 'razorpay-webhook', 30, 60000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too Many Requests: Webhook rate limit exceeded.' },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil(rateLimitResult.resetMs / 1000).toString(),
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil((Date.now() + rateLimitResult.resetMs) / 1000).toString()
          }
        }
      );
    }

    const bodyText = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || '';
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!secret) {
      console.error('RAZORPAY_WEBHOOK_SECRET is not configured on the server.');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(bodyText)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const signatureBuffer = Buffer.from(signature, 'hex');

    // Constant-time comparison using double-hashing to prevent timing leaks on length mismatches
    const h1 = crypto.createHash('sha256').update(expectedBuffer).digest();
    const h2 = crypto.createHash('sha256').update(signatureBuffer).digest();

    if (!crypto.timingSafeEqual(h1, h2)) {
      console.warn('Razorpay signature verification mismatch.');
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 400 });
    }

    const payload = JSON.parse(bodyText);
    const event = payload.event;

    // Replay Attack Deduplication
    const eventId = payload.id; // Razorpay sends a unique event ID in 'id' key
    if (eventId) {
      let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      if (supabaseUrl && !supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
        supabaseUrl = `https://${supabaseUrl}.supabase.co`;
      }
      const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

      if (isSupabaseConfigured) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // Attempt atomic insert first to leverage primary key unique constraint
        const { error: insertErr } = await supabase.from('processed_webhooks').insert({
          event_id: eventId,
          provider: 'razorpay'
        });

        if (insertErr) {
          // PostgreSQL duplicate key error code is '23505'
          if (insertErr.code === '23505') {
            console.log(`[Deduplication] Razorpay event ${eventId} already processed or processing. Ignoring.`);
            return NextResponse.json({ success: true, duplicate: true }, { status: 200 });
          }
          console.error('[Deduplication] Error registering webhook event:', insertErr);
          return NextResponse.json({ error: 'Deduplication logging failed' }, { status: 500 });
        }
      }
    }

    console.log(`Received Razorpay webhook event: ${event}`);

    // Process order capture
    if (event === 'order.paid' || event === 'payment.captured') {
      const paymentEntity = payload.payload.payment.entity;
      const amount = paymentEntity.amount / 100; // converted from paise to INR
      const transactionId = paymentEntity.id;
      const orderId = paymentEntity.order_id;
      
      console.log(`Razorpay Payment Captured: Transaction ${transactionId} for Order ID ${orderId} (₹${amount})`);
      
      // In production: Query database using transaction reference and update matching orders status to 'paid'
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error in Razorpay webhook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
