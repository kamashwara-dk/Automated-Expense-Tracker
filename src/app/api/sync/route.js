import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_CATEGORIES = [
  'Food & Dining',
  'Shopping',
  'Transportation',
  'Bills & Utilities',
  'Entertainment',
  'Healthcare',
  'Personal Care',
  'Subscriptions',
  'Auto-Captured',
  'Requires Review',
  'Other',
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Requested-With',
};

// ─── Category keyword map ─────────────────────────────────────────────────────

const CATEGORY_KEYWORDS = {
  'Food & Dining': [
    'zomato', 'swiggy', 'restaurant', 'cafe', 'coffee', 'tea', 'food',
    'pizza', 'burger', 'biryani', 'hotel', 'dhaba', 'bakery', 'kitchen',
    'eatery', 'dining', 'starbucks', 'dominos', 'kfc', 'mcdonalds', 'subway',
  ],
  'Shopping': [
    'amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'meesho', 'shop',
    'store', 'market', 'mall', 'mart', 'retail', 'bazar', 'bazaar',
    'dmart', 'bigbasket', 'grofer', 'zepto', 'blinkit',
  ],
  'Transportation': [
    'uber', 'ola', 'rapido', 'auto', 'cab', 'taxi', 'irctc', 'railway',
    'metro', 'bus', 'petrol', 'diesel', 'fuel', 'parking', 'toll',
    'redbus', 'makemytrip', 'flight', 'indigo', 'airindia', 'spicejet',
  ],
  'Bills & Utilities': [
    'electric', 'electricity', 'water', 'gas', 'internet', 'broadband',
    'wifi', 'airtel', 'jio', 'bsnl', 'recharge', 'bill', 'utility',
  ],
  'Entertainment': [
    'netflix', 'prime', 'hotstar', 'disney', 'spotify', 'youtube',
    'movie', 'cinema', 'pvr', 'inox', 'bookmyshow', 'gaming',
  ],
  'Healthcare': [
    'pharmacy', 'medical', 'hospital', 'clinic', 'doctor', 'medicine',
    'apollo', 'medplus', 'netmeds', '1mg', 'practo', 'health', 'lab',
  ],
  'Personal Care': [
    'salon', 'spa', 'parlour', 'parlor', 'haircut', 'beauty', 'grooming',
  ],
  'Subscriptions': [
    'subscription', 'renewal', 'plan', 'membership', 'annual', 'monthly',
  ],
};

function inferCategory(smsText, merchantName = '') {
  const haystack = `${smsText} ${merchantName}`.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (haystack.includes(kw)) return category;
    }
  }
  return 'Auto-Captured';
}

// ─── SMS Parser — NEVER throws, always returns a result ──────────────────────

/**
 * Attempts to parse amount + merchant from a raw bank SMS.
 * On any failure, returns safe fallback values instead of erroring.
 */
function parseSms(rawSms) {
  const text = (rawSms || '').trim();
  const preview = text.substring(0, 20); // for fallback merchant label

  let amount = 0;
  let merchant = `Unparsed: ${preview}`;
  let category = 'Requires Review';

  try {
    // ── Amount ───────────────────────────────────────────────────────────────
    // Primary: Rs / Rs. (your exact requested regex)
    const amountMatch =
      text.match(/Rs\.?\s*([\d,]+\.?\d*)/i) ||
      text.match(/(?:INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);

    if (amountMatch && amountMatch[1]) {
      const parsed = parseFloat(amountMatch[1].replace(/,/g, ''));
      if (!isNaN(parsed) && parsed > 0) {
        amount = parsed;
      }
    }

    // ── Merchant ─────────────────────────────────────────────────────────────
    // Primary: your exact requested regex
    const merchantMatch =
      text.match(/to\s+([A-Za-z0-9\s]+?)(?:\.|\s+UPI|\s+Ref)/i) ||
      text.match(/VPA[:\s]+([^\s,;.@]+)/i) ||
      text.match(/info\/([^\/\s,;.]+)/i) ||
      text.match(/\bto\s+([A-Za-z0-9@.\-_]+(?:\s+[A-Za-z0-9@.\-_]+){0,3}?)(?:\s+(?:on|at|via|for|ref|upi|a\/c|\d)|[,;.]|$)/i) ||
      text.match(/\b([A-Za-z0-9.\-_]+@[A-Za-z0-9.\-_]+)\b/);

    if (merchantMatch && merchantMatch[1] && merchantMatch[1].trim().length > 0) {
      let raw = merchantMatch[1].trim();
      raw = raw.replace(/[.,;:\-]+$/, '').trim();
      if (raw.includes('@')) raw = raw.split('@')[0];
      merchant = raw
        .split(/[\s_-]+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ') || `Unparsed: ${preview}`;
    }

    // ── Category ─────────────────────────────────────────────────────────────
    if (amount > 0) {
      // Only infer category if we got a real merchant
      category = inferCategory(text, merchant);
    }
    // If amount is 0, keep 'Requires Review' so the user knows to check it

  } catch (err) {
    // Parsing threw unexpectedly — log and keep fallbacks
    console.error('[SMS Parser] Unexpected error during parse:', err.message);
  }

  return { amount, merchant, category };
}

// ─── CORS preflight ───────────────────────────────────────────────────────────

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(request) {
  // ── Log the raw incoming payload for Vercel debugging ─────────────────────
  try {
    const rawText = await request.clone().text();
    console.log('Incoming Payload:', rawText);
  } catch (logErr) {
    console.warn('Could not log raw payload:', logErr.message);
  }

  try {
    // ── Parse JSON body ────────────────────────────────────────────────────
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON — could not parse request body' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('Parsed Body Keys:', Object.keys(body || {}));

    const { user_id } = body || {};
    let amount, merchant, category, date;
    let parsedFromSms = false;
    let smsDebug = null;

    // ── Path A: raw_sms present ────────────────────────────────────────────
    if (body?.raw_sms) {
      console.log('[SMS] raw_sms detected, length:', body.raw_sms.length);

      const parsed = parseSms(body.raw_sms);

      amount   = parsed.amount;
      merchant = parsed.merchant;
      category = parsed.category;
      date     = new Date().toISOString();
      parsedFromSms = true;

      smsDebug = {
        raw_preview: body.raw_sms.substring(0, 80),
        extracted: { amount, merchant, category },
      };

      console.log('[SMS] Extracted:', smsDebug.extracted);
    }

    // ── Path B: structured JSON payload (existing behaviour) ──────────────
    else {
      amount   = body?.amount;
      merchant = body?.merchant;
      category = body?.category;
      date     = body?.date;

      // Structured path still validates strictly
      const errors = [];

      if (amount === undefined || amount === null || amount === '') {
        errors.push('amount is required');
      } else if (isNaN(Number(amount)) || Number(amount) <= 0) {
        errors.push('amount must be a positive number');
      }

      if (!merchant || typeof merchant !== 'string' || !merchant.trim()) {
        errors.push('merchant is required and must be a non-empty string');
      }

      if (!category || typeof category !== 'string' || !category.trim()) {
        errors.push('category is required and must be a non-empty string');
      }

      if (!date || isNaN(Date.parse(date))) {
        errors.push('date is required and must be a valid ISO date string');
      }

      if (errors.length > 0) {
        console.warn('Structured payload validation failed:', errors);
        return NextResponse.json(
          { success: false, error: 'Validation failed', details: errors },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // ── Build insert record ────────────────────────────────────────────────
    const insertRecord = {
      amount:   Number(amount)   || 0,
      merchant: String(merchant || 'Unknown').trim(),
      category: String(category || 'Requires Review').trim(),
      date:     date ? new Date(date).toISOString() : new Date().toISOString(),
    };

    if (user_id && typeof user_id === 'string' && user_id.trim()) {
      insertRecord.user_id = user_id.trim();
    }

    console.log('Inserting record:', JSON.stringify(insertRecord));

    const localFallback = {
      id: 'tx-' + Date.now(),
      ...insertRecord,
      created_at: new Date().toISOString(),
    };

    // ── Local / demo mode ──────────────────────────────────────────────────
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        {
          success: true,
          message: parsedFromSms
            ? 'SMS parsed & validated (Supabase not configured — local mode)'
            : 'Transaction validated (local mode)',
          data: localFallback,
          parsed_from_sms: parsedFromSms,
          ...(smsDebug && { sms_debug: smsDebug }),
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // ── Insert into Supabase ───────────────────────────────────────────────
    const { data, error } = await supabase
      .from('transactions')
      .insert([insertRecord])
      .select();

    if (error) {
      console.warn('Supabase Insert Error:', error.message);
      // Still return 200 with fallback so iOS Shortcut doesn't retry endlessly
      return NextResponse.json(
        {
          success: true,
          message: 'Transaction accepted (Supabase write failed — check logs)',
          data: localFallback,
          warning: error.message,
          parsed_from_sms: parsedFromSms,
          hint: error.message.includes('row-level security')
            ? 'RLS blocked the insert — ensure user_id matches the authenticated user.'
            : error.message.includes('schema cache')
            ? 'The "transactions" table may not exist. Run the setup SQL in Supabase.'
            : undefined,
        },
        { status: 200, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: parsedFromSms
          ? 'SMS parsed & synced to Supabase successfully'
          : 'Transaction synced to Supabase successfully',
        data: data && data.length > 0 ? data[0] : localFallback,
        user_id: user_id || null,
        parsed_from_sms: parsedFromSms,
        ...(smsDebug && { sms_debug: smsDebug }),
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (err) {
    console.error('Unhandled Sync API Error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: err.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
