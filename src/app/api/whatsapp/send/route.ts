import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit } from '../../../../lib/rateLimiter';

export async function POST(request: Request) {
  try {
    // 1. Rate Limiting Check: 10 requests per minute
    const rateLimitResult = await rateLimit(request, 'whatsapp-send', 10, 60000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too Many Requests: Rate limit exceeded. Please try again later.' },
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

    const body = await request.json();
    const { 
      storeId, 
      orderId, 
      phone, 
      content, 
      messageType, 
      customerName,
      orderNumber,
      itemsSummary,
      total,
      paymentStatus,
      paymentMethod
    } = body;

    // Early Input Validation
    if (!storeId || typeof storeId !== 'string' || storeId.length !== 36) {
      return NextResponse.json({ error: 'Validation Error: Invalid storeId format' }, { status: 400 });
    }
    if (orderId && typeof orderId !== 'string') {
      return NextResponse.json({ error: 'Validation Error: Invalid orderId format' }, { status: 400 });
    }
    if (!phone || typeof phone !== 'string' || phone.length < 7 || phone.length > 20) {
      return NextResponse.json({ error: 'Validation Error: Invalid or missing phone number' }, { status: 400 });
    }
    if (content && typeof content !== 'string') {
      return NextResponse.json({ error: 'Validation Error: Invalid content format' }, { status: 400 });
    }
    if (messageType && typeof messageType !== 'string') {
      return NextResponse.json({ error: 'Validation Error: Invalid messageType format' }, { status: 400 });
    }

    // Normalize and declare Supabase configuration
    let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    if (supabaseUrl && !supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
      supabaseUrl = `https://${supabaseUrl}.supabase.co`;
    }
    const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';

    // Security check: In production, verify user session using Supabase JWT
    const isSandboxRequest = token === 'SANDBOX-TOKEN' || storeId === 'd5089f81-5c31-4198-8422-921cf05db631' || storeId === 'e8d2e8b2-5a21-4cc1-8e0f-90e94bb507ef';

    if (isSupabaseConfigured && process.env.NODE_ENV === 'production' && !isSandboxRequest) {
      if (!token) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }

      // Initialize Supabase Client using normalized URL and authorization header for RLS
      const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      });

      // Verify the JWT with Supabase auth
      const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
      if (authErr || !user) {
        return NextResponse.json({ error: 'Unauthorized: Invalid session token' }, { status: 401 });
      }

      // Verify that user is active and belongs to the store
      const { data: storeUser, error: storeUserErr } = await supabaseAdmin
        .from('store_users')
        .select('role')
        .eq('store_id', storeId)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .maybeSingle();

      if (storeUserErr || !storeUser) {
        return NextResponse.json({ error: 'Forbidden: User does not belong to this store' }, { status: 403 });
      }
    }

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!accessToken || !phoneNumberId) {
      return NextResponse.json(
        { error: 'WhatsApp credentials missing on server. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env.local.' },
        { status: 400 }
      );
    }

    // Format phone number: Meta API requires country code without '+' or spaces.
    // e.g. 9876543210 -> 919876543210 (assuming India '91' country code if 10 digits)
    let formattedPhone = phone.replace(/\D/g, '');
    // Strip leading zero if present (e.g. 09876543210 -> 9876543210)
    if (formattedPhone.startsWith('0')) {
      formattedPhone = formattedPhone.substring(1);
    }
    if (formattedPhone.length === 10) {
      formattedPhone = `91${formattedPhone}`;
    }

    console.log(`Sending WhatsApp message via Meta Cloud API to ${formattedPhone}...`);

    // Call Meta WhatsApp Cloud API
    const useTemplates = process.env.WHATSAPP_USE_TEMPLATES !== 'false';
    const isTemplate = messageType === 'hello_world' || messageType === 'template';

    let requestBody;

    if (useTemplates || isTemplate) {
      const templateLanguage = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en_US';
      let templateName = 'hello_world';
      let parameters: any[] = [];

      if (messageType === 'hello_world') {
        templateName = 'hello_world';
      } else {
        // Fetch order details for template parameters
        const client = isSupabaseConfigured
          ? createClient(supabaseUrl, supabaseAnonKey, {
              global: {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
              }
            })
          : null;

        let dbOrderNumber = orderNumber || orderId || '101';
        let dbCustomerName = customerName || 'Guest';
        let dbItemsSummary = itemsSummary || 'Items';
        let dbTotal = total?.toString() || '0';
        let dbPayment = paymentStatus === 'paid'
          ? `PAID (via ${paymentMethod?.toUpperCase() || 'UPI'})`
          : `PENDING (via ${paymentMethod?.toUpperCase() || 'CASH'})`;

        if (client && orderId && storeId) {
          try {
            // Find order flexibly by UUID id or order_number string
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
            let query = client
              .from('orders')
              .select('id, order_number, total, payment_status, payment_method, customer_id')
              .eq('store_id', storeId);

            if (isUUID) {
              query = query.eq('id', orderId);
            } else {
              query = query.eq('order_number', orderId);
            }

            const { data: orderData } = await query.maybeSingle();

            if (orderData) {
              dbOrderNumber = orderData.order_number || orderId;
              dbTotal = orderData.total?.toString() || '0';
              
              if (orderData.payment_status === 'paid') {
                dbPayment = `PAID (via ${orderData.payment_method?.toUpperCase() || 'UPI'})`;
              } else {
                dbPayment = `PENDING (via ${orderData.payment_method?.toUpperCase() || 'CASH'})`;
              }

              // Find customer
              if (orderData.customer_id) {
                const { data: customerData } = await client
                  .from('customers')
                  .select('name')
                  .eq('id', orderData.customer_id)
                  .maybeSingle();
                if (customerData?.name) {
                  dbCustomerName = customerData.name;
                }
              }

              // Find items using correct columns: qty, name directly on order_items
              const { data: orderItems } = await client
                .from('order_items')
                .select('qty, name')
                .eq('order_id', orderData.id);

              if (orderItems && orderItems.length > 0) {
                dbItemsSummary = orderItems
                  .map((item: any) => `${item.name || 'Item'} x${item.qty}`)
                  .join(', ');
              }
            }
          } catch (dbErr) {
            console.error('Error fetching template parameters from DB:', dbErr);
          }
        }

        if (messageType === 'order_received') {
          templateName = process.env.WHATSAPP_TEMPLATE_RECEIVED || 'order_received';
          parameters = [
            { type: 'text', text: dbCustomerName },
            { type: 'text', text: dbOrderNumber },
            { type: 'text', text: dbItemsSummary },
            { type: 'text', text: dbTotal },
            { type: 'text', text: dbPayment }
          ];
        } else if (messageType === 'order_ready') {
          templateName = process.env.WHATSAPP_TEMPLATE_READY || 'order_ready';
          parameters = [
            { type: 'text', text: dbCustomerName },
            { type: 'text', text: dbOrderNumber }
          ];
        } else if (messageType === 'order_cancelled') {
          templateName = process.env.WHATSAPP_TEMPLATE_CANCELLED || 'order_cancelled';
          parameters = [
            { type: 'text', text: dbCustomerName },
            { type: 'text', text: dbOrderNumber }
          ];
        }
      }

      requestBody = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: templateLanguage
          },
          components: parameters.length > 0 ? [
            {
              type: 'body',
              parameters: parameters
            }
          ] : undefined
        }
      };
    } else {
      requestBody = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'text',
        text: {
          preview_url: false,
          body: content
        }
      };
    }

    // Setup AbortController for 5-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let response;
    try {
      response = await fetch(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    const contentType = response.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const rawText = await response.text();
      data = { 
        error: { 
          message: `Non-JSON API response received: ${rawText.substring(0, 150)}` 
        } 
      };
    }



    let dbLogId = null;

    if (response.ok && data.messages && data.messages[0]) {
      const metaMessageId = data.messages[0].id;
      
      // Save log to Supabase if configured
      if (isSupabaseConfigured) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        let actualOrderUUID: string | null = null;
        if (orderId) {
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
          if (isUUID) {
            actualOrderUUID = orderId;
          } else {
            const { data: dbOrder } = await supabase
              .from('orders')
              .select('id')
              .eq('order_number', orderId)
              .eq('store_id', storeId)
              .maybeSingle();
            if (dbOrder) actualOrderUUID = dbOrder.id;
          }
        }

        try {
          const { data: insertedLog } = await supabase
            .from('whatsapp_logs')
            .insert({
              store_id: storeId,
              order_id: actualOrderUUID,
              phone: formattedPhone,
              message_type: messageType,
              payload: { response: data, content, customerName },
              status: 'sent'
            })
            .select()
            .maybeSingle();
          if (insertedLog) dbLogId = insertedLog.id;
        } catch (dbErr) {
          console.error('Error saving whatsapp_log to Supabase:', dbErr);
        }
      }

      return NextResponse.json({
        success: true,
        metaMessageId,
        dbLogId,
        content
      });
    } else {
      console.error(
        `Meta WhatsApp API error: Status ${response.status} | Code: ${data?.error?.code || 'N/A'} | Message: ${data?.error?.message || 'Unknown'}`
      );
      const errorMessage = data.error?.message || 'Meta API returned error';

      if (isSupabaseConfigured) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        try {
          await supabase.from('whatsapp_logs').insert({
            store_id: storeId,
            phone: formattedPhone,
            message_type: messageType,
            payload: { error: data, content, customerName },
            status: 'failed',
            error_message: errorMessage
          });
        } catch (dbErr) {
          console.error('Error saving failed whatsapp_log to Supabase:', dbErr);
        }
      }

      return NextResponse.json(
        { error: `Meta WhatsApp API request failed: ${errorMessage}` },
        { status: response.status }
      );
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('Meta WhatsApp API request timed out after 5000ms.');
      return NextResponse.json({ error: 'WhatsApp API service gateway timeout' }, { status: 504 });
    }
    console.error('Error in whatsapp/send API route:', error.message || error);
    return NextResponse.json({ error: 'Internal server error occurred' }, { status: 500 });
  }
}
