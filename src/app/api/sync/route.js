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
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Requested-With, Accept',
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

// ─── Flexible body parser ─────────────────────────────────────────────────────
// Accepts: application/json, text/plain, text/*, form-urlencoded, or raw text
// Returns a plain object (never throws)

async function parseBody(request) {
  const rawText = await request.text().catch(() => '');
  console.log('Incoming raw body:', rawText.substring(0, 300));
  console.log('Content-Type:', request.headers.get('content-type') || 'none');

  if (!rawText || rawText.trim() === '') {
    console.warn('Empty body received');
    return {};
  }

  // Try JSON first (works for any content-type that sends JSON text)
  try {
    const parsed = JSON.parse(rawText);
    console.log('Parsed as JSON, keys:', Object.keys(parsed));
    return parsed;
  } catch {
    // Not JSON
  }

  // Try URL-encoded form: key=value&key2=value2
  if (rawText.includes('=')) {
    try {
      const params = new URLSearchParams(rawText);
      const obj = {};
      for (const [k, v] of params.entries()) obj[k] = v;
      if (Object.keys(obj).length > 0) {
        console.log('Parsed as form-urlencoded, keys:', Object.keys(obj));
        return obj;
      }
    } catch {
      // Not form-encoded
    }
  }

  // Treat the entire body as a raw SMS string
  console.log('Treating entire body as raw_sms text');
  return { raw_sms: rawText };
}

// ─── SMS Parser — never throws ────────────────────────────────────────────────

function parseSms(rawSms) {
  const text = (rawSms || '').trim();
  const preview = text.substring(0, 20);

  let amount = 0;
  let merchant = `Unparsed: ${preview}`;
  let category = 'Requires Review';

  try {
    // Amount: Rs / Rs. / INR / ₹
    const amountMatch =
      text.match(/Rs\.?\s*([\d,]+\.?\d*)/i) ||
      text.match(/(?:INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);

    if (amountMatch?.[1]) {
      const n = parseFloat(amountMatch[1].replace(/,/g, ''));
      if (!isNaN(n) && n > 0) amount = n;
    }

    // Merchant: your exact regex first, then fallbacks
    const merchantMatch =
      text.match(/to\s+([A-Za-z0-9\s]+?)(?:\.|\s+UPI|\s+Ref)/i) ||
      text.match(/VPA[:\s]+([^\s,;.@]+)/i) ||
      text.match(/info\/([^\/\s,;.]+)/i) ||
      text.match(/\bto\s+([A-Za-z0-9@.\-_]+(?:\s+[A-Za-z0-9@.\-_]+){0,3}?)(?:\s+(?:on|at|via|for|ref|upi|a\/c|\d)|[,;.]|$)/i) ||
      text.match(/\b([A-Za-z0-9.\-_]+@[A-Za-z0-9.\-_]+)\b/);

    if (merchantMatch?.[1]?.trim()) {
      let raw = merchantMatch[1].trim().replace(/[.,;:\-]+$/, '');
      if (raw.includes('@')) raw = raw.split('@')[0];
      merchant = raw
        .split(/[\s_-]+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ') || `Unparsed: ${preview}`;
    }

    category = amount > 0 ? inferCategory(text, merchant) : 'Requires Review';
  } catch (err) {
    console.error('[SMS Parser] Error:', err.message);
  }

  return { amount, merchant, category };
}

// ─── CORS preflight ───────────────────────────────────────────────────────────

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// ─── GET — simple health check (useful for testing from browser) ──────────────

export async function GET() {
  return NextResponse.json(
    { success: true, message: 'My Valuta /api/sync is live. Use POST to sync transactions.' },
    { status: 200, headers: corsHeaders }
  );
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(request) {
  try {
    // Parse body — accepts JSON, form-urlencoded, plain text, or raw SMS
    const body = await parseBody(request);

    const { user_id } = body;
    let amount, merchant, category, date;
    let parsedFromSms = false;
    let smsDebug = null;

    // ── Path A: raw_sms field present OR body looks like SMS text ─────────
    if (body.raw_sms) {
      console.log('[SMS] Parsing raw_sms:', String(body.raw_sms).substring(0, 80));

      const parsed = parseSms(body.raw_sms);
      amount   = parsed.amount;
      merchant = parsed.merchant;
      category = parsed.category;
      date     = new Date().toISOString();
      parsedFromSms = true;
      smsDebug = {
        raw_preview: String(body.raw_sms).substring(0, 80),
        extracted: { amount, merchant, category },
      };
      console.log('[SMS] Result:', smsDebug.extracted);
    }

    // ── Path B: structured JSON fields ────────────────────────────────────
    else {
      amount   = body.amount;
      merchant = body.merchant;
      category = body.category;
      date     = body.date;

      const errors = [];
      if (amount == null || amount === '')            errors.push('amount is required');
      else if (isNaN(Number(amount)) || Number(amount) <= 0) errors.push('amount must be a positive number');
      if (!merchant?.toString().trim())               errors.push('merchant is required');
      if (!category?.toString().trim())               errors.push('category is required');
      if (!date || isNaN(Date.parse(date)))           errors.push('date must be a valid ISO string');

      if (errors.length > 0) {
        console.warn('Structured validation errors:', errors);
        return NextResponse.json(
          { success: false, error: 'Validation failed', details: errors },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // ── Build record ───────────────────────────────────────────────────────
    const insertRecord = {
      amount:   Number(amount) || 0,
      merchant: String(merchant || 'Unknown').trim(),
      category: String(category || 'Requires Review').trim(),
      date:     date ? new Date(date).toISOString() : new Date().toISOString(),
    };

    if (user_id && String(user_id).trim()) {
      insertRecord.user_id = String(user_id).trim();
    }

    console.log('Insert record:', JSON.stringify(insertRecord));

    const localFallback = {
      id: 'tx-' + Date.now(),
      ...insertRecord,
      created_at: new Date().toISOString(),
    };

    // ── Local / demo mode ─────────────────────────────────────────────────
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        {
          success: true,
          message: 'Validated (Supabase not configured — local mode)',
          data: localFallback,
          parsed_from_sms: parsedFromSms,
          ...(smsDebug && { sms_debug: smsDebug }),
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // ── Supabase insert ────────────────────────────────────────────────────
    const { data, error } = await supabase
      .from('transactions')
      .insert([insertRecord])
      .select();

    if (error) {
      console.warn('Supabase error:', error.message);
      return NextResponse.json(
        {
          success: true,
          message: 'Accepted (Supabase write failed — see warning)',
          data: localFallback,
          warning: error.message,
          parsed_from_sms: parsedFromSms,
          hint: error.message.includes('row-level security')
            ? 'RLS blocked insert — ensure user_id matches the authenticated user.'
            : error.message.includes('schema cache')
            ? '"transactions" table missing — run the setup SQL in Supabase.'
            : undefined,
        },
        { status: 200, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: parsedFromSms
          ? 'SMS parsed & synced successfully'
          : 'Transaction synced successfully',
        data: data?.[0] ?? localFallback,
        user_id: user_id || null,
        parsed_from_sms: parsedFromSms,
        ...(smsDebug && { sms_debug: smsDebug }),
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (err) {
    console.error('Unhandled error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: err.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
