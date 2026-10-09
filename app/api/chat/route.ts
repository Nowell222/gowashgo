import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { formatPeso } from '@/lib/utils/currency';
import { formatOrderStatus } from '@/lib/orders/status-machine';
import type { OrderStatus } from '@/lib/types';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, history = [] }: { message: string; history: ChatMessage[] } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Message is required' } },
        { status: 400 }
      );
    }

    // 1. Fetch user context & active orders if authenticated
    let customerContext = 'The user is browsing as a guest.';
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const serviceClient = createServiceClient();
        const { data: profile } = await serviceClient
          .from('users')
          .select('full_name, email, phone')
          .eq('id', user.id)
          .single();

        const { data: orders } = await serviceClient
          .from('orders')
          .select(`
            id, order_number, status, total, weight_kg, payment_method, cash_collected,
            created_at, pickup_address, delivery_address,
            rider:users!orders_rider_id_fkey(full_name, phone),
            branch:branches(name, phone)
          `)
          .eq('customer_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3);

        const customerName = profile?.full_name || 'Customer';
        let ordersSummary = 'No recent orders found.';

        if (orders && orders.length > 0) {
          ordersSummary = orders.map((o: any) => {
            const riderInfo = o.rider ? `Rider: ${o.rider.full_name} (${o.rider.phone || 'No phone'})` : 'Rider: Not yet assigned';
            const weightInfo = o.weight_kg ? `Weighed: ${o.weight_kg} kg` : 'Doorstep weighing pending';
            return `- Order #${o.order_number}: Status is "${formatOrderStatus(o.status as OrderStatus)}" (code: ${o.status}). Total: ${formatPeso(o.total)}. ${weightInfo}. Payment: ${o.payment_method?.toUpperCase()} (${o.cash_collected ? 'Cash Collected' : 'Pending'}). ${riderInfo}. Branch: ${o.branch?.name || 'Local Hub'}.`;
          }).join('\n');
        }

        customerContext = `Current Customer Name: ${customerName}
Active/Recent Customer Orders:
${ordersSummary}`;
      }
    } catch (e) {
      console.warn('Chat context retrieval warning:', e);
    }

    // 2. Build system prompt for Gemini
    const systemPrompt = `You are "WashGo AI Assistant", the friendly and expert laundry concierge for GoWashGo (a smart on-demand laundry pickup & delivery service in the Philippines).

YOUR CAPABILITIES & KNOWLEDGE:
1. Customer Inquiries & Order Tracking:
   - If the customer asks about their order, use the real order data below to provide exact, reassuring status updates, rider details, and prices.
   - Real-time customer data:
${customerContext}

2. GoWashGo Business & Service Model:
   - Doorstep Portable Scale: Riders carry calibrated hanging scales directly to the customer's door. Laundry is weighed right in front of the customer.
   - Instant Transparent Pricing: Base wash is ₱35.00/kg + flat ₱50.00 delivery fee. Total is locked in instantly upon doorstep scale verification.
   - Payment Options: Customers can pay online anytime (GCash, Maya Wallet, Credit/Debit card via PayMongo) or Cash on Delivery (COD) to the rider during delivery.
   - Service Stages: Order Booked -> Rider Assigned -> Pickup En Route -> Weighed & Picked Up -> At Facility Hub (Wash, Dry, Fold) -> Ready for Delivery -> Delivery En Route -> Delivered.

3. Commercial Garment Care & Stain Removal Tips:
   - Give expert, practical, safe advice for fabric care (cotton, silk, wool, linen, denim) and stain removal (coffee, oil, ink, red wine, sweat).
   - Emphasize commercial pre-treatment and gentle drying techniques.

TONE & STYLE:
- Friendly, warm, polite, and helpful (Filipino hospitality).
- Clear, concise formatting (use bullet points or bold highlights when explaining steps).
- If the user greets or speaks in Taglish or Filipino (e.g. "Kumusta", "Saan na order ko?"), respond naturally in warm English with friendly Filipino courtesy (e.g., "Opo", "Mabuhay!", "Salamat!").
- Keep responses concise and easy to read on mobile screens (under 120 words unless answering a complex stain inquiry).`;

    const apiKey = process.env.GEMINI_API_KEY;

    // 3. Fallback engine if no Gemini API Key is configured yet
    if (!apiKey) {
      let cannedResponse = "Hello! I'm your GoWashGo Laundry Concierge. How can I help you with your laundry, order tracking, or stain care today?";
      const lower = message.toLowerCase();

      if (lower.includes('order') || lower.includes('status') || lower.includes('where') || lower.includes('nasaan')) {
        cannedResponse = customerContext.includes('Order #')
          ? `Here is your latest order status:\n\n${customerContext.split('Active/Recent Customer Orders:\n')[1] || 'Your order is currently being processed.'}\n\nYou can track live GPS rider movement anytime on your Orders tab!`
          : "You don't have an active order right now. You can book a doorstep scale pickup anytime by tapping the '+' Book tab below!";
      } else if (lower.includes('price') || lower.includes('cost') || lower.includes('rate') || lower.includes('magkano')) {
        cannedResponse = "GoWashGo uses instant doorstep scale pricing!\n\n• Base Wash, Dry & Fold: ₱35.00 / kg\n• Flat Delivery Fee: ₱50.00\n\nOur rider weighs your laundry at your door with a certified hanging scale, and your exact total computes on your phone instantly!";
      } else if (lower.includes('gcash') || lower.includes('maya') || lower.includes('payment') || lower.includes('pay') || lower.includes('cod')) {
        cannedResponse = "We accept:\n• GCash & Maya (instant mobile e-wallet)\n• Credit / Debit Cards (Visa, Mastercard)\n• Cash on Delivery (COD) upon laundry handover\n\nYou can switch between Online and Cash anytime before delivery!";
      } else if (lower.includes('stain') || lower.includes('wine') || lower.includes('coffee') || lower.includes('oil')) {
        cannedResponse = "For tough stains (coffee, wine, oil):\n1. Blot immediately with a damp towel (never rub, which sets the stain into fibers).\n2. When booking, select the 'Visible Stains' tag so our hub staff applies commercial enzyme pre-treatment before washing!";
      }

      return NextResponse.json({ reply: cannedResponse });
    }

    // 4. Call Google Gemini API (gemini-3.5-flash-lite / gemini-3.5-flash / gemini-3.8-flash)
    const formattedContents = [
      {
        role: 'user',
        parts: [{ text: systemPrompt }],
      },
      {
        role: 'model',
        parts: [{ text: 'Understood. I am GoWashGo AI Assistant, ready to assist customers with their laundry orders, garment care, and service inquiries.' }],
      },
    ];

    // Append conversation history
    for (const h of history.slice(-6)) {
      formattedContents.push({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }],
      });
    }

    // Append latest user message
    formattedContents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    let rawReply: string | null = null;
    const CANDIDATE_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash'];

    for (const model of CANDIDATE_MODELS) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: formattedContents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 350,
            },
          }),
          signal: AbortSignal.timeout(6000),
        });

        if (res.ok) {
          const data = await res.json();
          rawReply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawReply) break;
        } else {
          const errText = await res.text();
          console.warn(`Gemini model ${model} error:`, errText);
        }
      } catch (err: any) {
        console.warn(`Gemini model ${model} fetch failed:`, err?.message || err);
      }
    }

    // Resilient fallback if AI is unavailable: provide real customer order info if present
    if (!rawReply) {
      if (customerContext.includes('Order #')) {
        rawReply = `Here is your current order update:\n\n${customerContext.split('Active/Recent Customer Orders:\n')[1] || customerContext}\n\nYou can also monitor live rider status on your Orders tab anytime!`;
      } else {
        rawReply = "Kumusta! I am your GoWashGo Laundry Concierge. How can I help you with booking a pickup, tracking an order, or fabric stain care today?";
      }
    }

    return NextResponse.json({ reply: rawReply });
  } catch (err: any) {
    console.error('Chat endpoint error:', err);
    return NextResponse.json({
      reply: "Kumusta! I'm your GoWashGo Laundry Concierge. You can view all your ongoing washes in the Orders tab or message our branch hotline anytime!",
    });
  }
}
