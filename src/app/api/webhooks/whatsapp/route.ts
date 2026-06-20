import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { rateLimit } from '../../../../lib/rateLimiter';

// 1. Meta Webhook Handshake Verification (GET)
export async function GET(request: Request) {
  // Rate Limiting Check: 30 requests per minute
  const rateLimitResult = await rateLimit(request, 'whatsapp-webhook-handshake', 30, 60000);
  if (!rateLimitResult.success) {
    return new Response('Too Many Requests: Webhook rate limit exceeded.', { 
      status: 429,
      headers: {
        'Retry-After': Math.ceil(rateLimitResult.resetMs / 1000).toString(),
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': Math.ceil((Date.now() + rateLimitResult.resetMs) / 1000).toString()
      }
    });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (!verifyToken) {
    console.error('WHATSAPP_VERIFY_TOKEN is not configured on the server.');
    return new Response('Server configuration error', { status: 500 });
  }

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WhatsApp Webhook verified successfully.');
    return new Response(challenge, { status: 200 });
  }

  return new Response('Verification failed', { status: 403 });
}

// 2. Outbound message status updater (POST)
export async function POST(request: Request) {
  try {
    // Rate Limiting Check: 30 requests per minute
    const rateLimitResult = await rateLimit(request, 'whatsapp-webhook-callback', 30, 60000);
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
    const signature = request.headers.get('x-hub-signature-256') || '';
    const appSecret = process.env.WHATSAPP_APP_SECRET;

    // Verify signature if WHATSAPP_APP_SECRET is set
    if (appSecret) {
      const cleanSignature = signature.startsWith('sha256=') ? signature.substring(7) : signature;
      const expectedSignature = crypto
        .createHmac('sha256', appSecret)
        .update(bodyText)
        .digest('hex');

      const expectedBuffer = Buffer.from(expectedSignature, 'hex');
      const signatureBuffer = Buffer.from(cleanSignature, 'hex');

      // Constant-time comparison using double-hashing to prevent timing leaks on length mismatches
      const h1 = crypto.createHash('sha256').update(expectedBuffer).digest();
      const h2 = crypto.createHash('sha256').update(signatureBuffer).digest();

      if (!crypto.timingSafeEqual(h1, h2)) {
        console.warn('WhatsApp callback signature verification failed.');
        return NextResponse.json({ error: 'Signature verification failed' }, { status: 400 });
      }
    } else {
      console.warn('WHATSAPP_APP_SECRET is not configured on the server. Skipping verification (unsafe for production).');
    }

    const body = JSON.parse(bodyText);
    
    // Validate entry payload
    if (body.object === 'whatsapp_business_account' && body.entry) {
      let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      if (supabaseUrl && !supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
        supabaseUrl = `https://${supabaseUrl}.supabase.co`;
      }
      const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);
      const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;

      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.value && change.value.statuses) {
            for (const status of change.value.statuses) {
              const messageId = status.id; // Meta Message ID
              const messageStatus = status.status; // 'sent', 'delivered', 'read', 'failed'
              const recipientPhone = status.recipient_id;
              
              console.log(`WhatsApp Status callback: Msg #${messageId} to ${recipientPhone} is now ${messageStatus}`);
              
              // Query database and update whatsapp_logs status if configured
              if (supabase) {
                try {
                  const { data: dbLog, error: fetchErr } = await supabase
                    .from('whatsapp_logs')
                    .select('id')
                    .eq('payload->messages->0->>id', messageId)
                    .maybeSingle();

                  if (dbLog && !fetchErr) {
                    await supabase
                      .from('whatsapp_logs')
                      .update({ 
                        status: messageStatus,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', dbLog.id);
                    
                    console.log(`Updated database whatsapp_log #${dbLog.id} status to: ${messageStatus}`);
                  }
                } catch (dbErr) {
                  console.error('Error updating webhook status in Supabase:', dbErr);
                }
              }
            }
          }
        }
      }
      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in WhatsApp webhook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
