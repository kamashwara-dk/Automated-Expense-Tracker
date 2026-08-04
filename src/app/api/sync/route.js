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
  'Other',
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Requested-With',
};

// ─── SMS Parser ───────────────────────────────────────────────────────────────

/**
 * Keyword → category mapping.
 * Words are matched case-insensitively against the raw SMS text.
 */
const CATEGORY_KEYWORDS = {
  'Food & Dining': [
    'zomato', 'swiggy', 'restaurant', 'cafe', 'coffee', 'tea', 'food',
    'pizza', 'burger', 'biryani', 'hotel', 'dhaba', 'bakery', 'kitchen',
    'eatery', 'dining', 'starbucks', 'dominos', 'kfc', 'mcdonalds', 'subway',
  ],
  'Shopping': [
    'amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'meesho', 'shop',
    'store', 'market', 'mall', 'mart', 'retail', 'bazar', 'bazaar',
    'reliance', 'dmart', 'bigbasket', 'grofer', 'zepto', 'blinkit',
  ],
  'Transportation': [
    'uber', 'ola', 'rapido', 'auto', 'cab', 'taxi', 'irctc', 'railway',
    'metro', 'bus', 'petrol', 'diesel', 'fuel', 'parking', 'toll',
    'redbus', 'makemytrip', 'flight', 'indigo', 'airindia', 'spicejet',
  ],
  'Bills & Utilities': [
    'electric', 'electricity', 'water', 'gas', 'internet', 'broadband',
    'wifi', 'airtel', 'jio', 'vi ', 'bsnl', 'recharge', 'bill', 'utility',
    'bescom', 'tata power', 'reliance energy', 'mahadiscom',
  ],
  'Entertainment': [
    'netflix', 'prime', 'hotstar', 'disney', 'spotify', 'youtube',
    'movie', 'cinema', 'pvr', 'inox', 'bookmyshow', 'gaming', 'game',
  ],
  'Healthcare': [
    'pharmacy', 'medical', 'hospital', 'clinic', 'doctor', 'medicine',
    'apollo', 'medplus', 'netmeds', '1mg', 'practo', 'health', 'lab',
    'pathology', 'diagnostic',
  ],
  'Personal Care': [
    'salon', 'spa', 'parlour', 'parlor', 'haircut', 'beauty', 'grooming',
  ],
  'Subscriptions': [
    'subscription', 'renewal', 'plan', 'membership', 'annual', 'monthly',
  ],
};

/**
 * Infer a category from the raw SMS text and parsed merchant name.
 * Returns the best match or 'Other'.
 */
function inferCategory(smsText, merchantName = '') {
  const haystack = `${smsText} ${merchantName}`.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (haystack.includes(kw)) return category;
    }
  }
  return 'Auto-Captured'; // default for SMS — no keyword match
}

/**
 * Parse a raw Indian bank SMS string and extract transaction fields.
 *
 * Amount  : /Rs\.?\s*([\d,]+\.?\d*)/i
 * Merchant: /to\s+([A-Za-z0-9\s]+?)(?:\.|\s+UPI|\s+Ref)/i  (with fallbacks)
 * Category: keyword inference, defaulting to 'Auto-Captured'
 * Date    : new Date().toISOString()
 *
 * @param {string} sms
 * @returns {{ amount: number, merchant: string, category: string, date: string } | null}
 */
function parseSms(sms) {
  if (!sms || typeof sms !== 'string') return null;

  const text = sms.trim();

  // ── 1. Extract amount ─────────────────────────────────────────────────────
  // Primary: your exact requested regex — Rs.1,234.50 | Rs 500 | Rs.500/-
  const amountRegex = /Rs\.?\s*([\d,]+\.?\d*)/i;
  let amountMatch = text.match(amountRegex);

  // Fallback: also handle INR and ₹ prefixes
  if (!amountMatch) {
    amountMatch = text.match(/(?:INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);
  }

  if (!amountMatch) {
    console.warn('[SMS Parser] Could not extract amount from:', text.slice(0, 100));
    return null;
  }

  const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  if (isNaN(amount) || amount <= 0) return null;

  // ── 2. Extract merchant ───────────────────────────────────────────────────
  let merchant = 'Unknown Merchant';

  // Your exact requested regex first
  const primaryMerchantRegex = /to\s+([A-Za-z0-9\s]+?)(?:\.|\s+UPI|\s+Ref)/i;
  const primaryMatch = text.match(primaryMerchantRegex);

  if (primaryMatch && primaryMatch[1] && primaryMatch[1].trim().length > 0) {
    merchant = primaryMatch[1].trim();
  } else {
    // Fallbacks for VPA/UPI patterns common in Indian bank SMS
    const fallbackPatterns = [
      /VPA[:\s]+([^\s,;.]+)/i,           // VPA merchant@upi
      /info\/([^\/\s,;.]+)/i,             // info/MerchantName
      /\bto\s+([A-Za-z0-9@.\-_]+(?:\s+[A-Za-z0-9@.\-_]+){0,3}?)(?:\s+(?:on|at|via|for|ref|upi|a\/c|\d)|[,;.]|$)/i,
      /\b([A-Za-z0-9.\-_]+@[A-Za-z0-9.\-_]+)\b/, // UPI ID
    ];

    for (const pattern of fallbackPatterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].trim().length > 0) {
        merchant = match[1].trim();
        break;
      }
    }
  }

  // Clean up merchant string
  merchant = merchant.replace(/[.,;:\-]+$/, '').trim();
  // Strip UPI handle — use the readable part before @
  if (merchant.includes('@')) {
    merchant = merchant.split('@')[0];
  }
  // Title-case
  merchant = merchant
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ') || 'Unknown Merchant';

  // ── 3. Category — keyword inference, default to 'Auto-Captured' ──────────
  const category = inferCategory(text, merchant);

  // ── 4. Date = current timestamp ──────────────────────────────────────────
  const date = new Date().toISOString();

  return { amount, merchant, category, date };
}

// ─── CORS preflight ───────────────────────────────────────────────────────────

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(request) {
  try {
    // Parse JSON body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON payload in request body' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { user_id } = body || {};
    let amount, merchant, category, date, parsedFromSms = false, smsDebug = null;

    // ── Path A: raw_sms field present — parse the SMS ───────────────────────
    if (body?.raw_sms) {
      const parsed = parseSms(body.raw_sms);

      if (!parsed) {
        return NextResponse.json(
          {
            success: false,
            error: 'SMS parsing failed',
            details: 'Could not extract a valid amount from the SMS text. Ensure it contains Rs/INR/₹ followed by a number.',
            raw_sms: body.raw_sms,
          },
          { status: 422, headers: corsHeaders }
        );
      }

      amount   = parsed.amount;
      merchant = parsed.merchant;
      category = parsed.category;
      date     = parsed.date;
      parsedFromSms = true;
      smsDebug = { raw: body.raw_sms, extracted: { amount: parsed.amount, merchant: parsed.merchant, category: parsed.category } };

      console.log('[SMS Parser] Extracted:', smsDebug.extracted, '| from:', body.raw_sms.slice(0, 80));
    }

    // ── Path B: structured JSON payload (existing behaviour) ────────────────
    else {
      amount   = body?.amount;
      merchant = body?.merchant;
      category = body?.category;
      date     = body?.date;
    }

    // ── Validate extracted / provided fields ────────────────────────────────
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
    } else if (!parsedFromSms && !VALID_CATEGORIES.includes(category.trim())) {
      // For structured payloads: soft-warn on unknown category but accept it
      console.warn(`Unknown category: "${category}" — stored as-is.`);
    }

    if (!date || isNaN(Date.parse(date))) {
      errors.push('date is required and must be a valid ISO date string');
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: errors },
        { status: 400, headers: corsHeaders }
      );
    }

    // ── Build the insert record ──────────────────────────────────────────────
    const insertRecord = {
      amount:   Number(amount),
      merchant: String(merchant).trim(),
      category: String(category).trim(),
      date:     new Date(date).toISOString(),
    };

    if (user_id && typeof user_id === 'string' && user_id.trim()) {
      insertRecord.user_id = user_id.trim();
    }

    const localFallback = {
      id: 'tx-' + Date.now(),
      ...insertRecord,
      created_at: new Date().toISOString(),
    };

    // ── Local / demo mode ────────────────────────────────────────────────────
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        {
          success: true,
          message: parsedFromSms
            ? 'SMS parsed & validated (Supabase not configured — local mode)'
            : 'Transaction validated (Supabase not configured — local mode)',
          data: localFallback,
          parsed_from_sms: parsedFromSms,
          ...(smsDebug && { sms_debug: smsDebug }),
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // ── Insert into Supabase ─────────────────────────────────────────────────
    const { data, error } = await supabase
      .from('transactions')
      .insert([insertRecord])
      .select();

    if (error) {
      console.warn('Supabase Insert Error:', error.message);
      return NextResponse.json(
        {
          success: true,
          message: 'Transaction accepted (Supabase write failed — stored locally)',
          data: localFallback,
          warning: error.message,
          parsed_from_sms: parsedFromSms,
          hint: error.message.includes('row-level security')
            ? 'RLS policy blocked the insert. Ensure user_id matches the authenticated user.'
            : error.message.includes('schema cache')
            ? 'The "transactions" table may not exist yet. Run the setup SQL in Supabase.'
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
