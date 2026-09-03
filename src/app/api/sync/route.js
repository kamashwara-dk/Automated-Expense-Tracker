import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '@/lib/supabaseClient';

// ── Service-role admin client (bypasses RLS) ──────────────────────────────────
// Used for:
//   1. profiles lookup  → sync_token → user_id   (auth check)
//   2. transactions insert                        (write on behalf of any user)
//
// Both NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in
// Vercel environment variables.  The service-role key is NEVER exposed to the
// browser — it only lives in this server-side route.
const supabaseAdmin =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } }
      )
    : null;

// ── CORS headers reused across responses ─────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Requested-With',
};

export async function GET() {
  return NextResponse.json({ success: true, message: 'Valuta API is live.' });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// ── Token → user_id resolver ──────────────────────────────────────────────────
// Queries public.profiles using the service-role client so RLS is bypassed.
// Returns the user's UUID on success, or null on any failure.
async function resolveUserIdFromToken(token) {
  if (!token || !supabaseAdmin) return null;

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('sync_token', token)
    .single();

  if (error) {
    // code PGRST116 = no rows matched — expected for invalid tokens
    console.warn('Token lookup failed:', error.code, error.message);
    return null;
  }

  return data?.id ?? null;
}

// ── POST /api/sync ────────────────────────────────────────────────────────────
export async function POST(req) {
  try {
    const bodyText = await req.text();

    let body;
    try {
      body = JSON.parse(bodyText);
    } catch {
      // Plain-text body — treat the whole thing as raw_sms
      body = { raw_sms: bodyText };
    }

    // ── 1. Authenticate via sync_token ──────────────────────────────────────
    // Accept token from either:
    //   a) Authorization: Bearer <token>  header
    //   b) body.sync_token                JSON field
    const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization') ?? '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const bodyToken   = body.sync_token ? String(body.sync_token).trim() : null;
    const incomingToken = bearerToken || bodyToken;

    if (!incomingToken) {
      console.warn('Request rejected: no sync_token provided');
      return NextResponse.json(
        { error: 'Unauthorized: sync_token is required' },
        { status: 401, headers: CORS }
      );
    }

    if (!supabaseAdmin) {
      // Service role key is missing — hard fail rather than silently misbehave
      console.error('supabaseAdmin is null — SUPABASE_SERVICE_ROLE_KEY is not set');
      return NextResponse.json(
        { error: 'Server misconfiguration' },
        { status: 500, headers: CORS }
      );
    }

    const resolvedUserId = await resolveUserIdFromToken(incomingToken);

    if (!resolvedUserId) {
      console.warn('Request rejected: sync_token not found in profiles table');
      return NextResponse.json(
        { error: 'Unauthorized: invalid or unrecognised sync_token' },
        { status: 401, headers: CORS }
      );
    }

    // ── 2. Parse the incoming payload ───────────────────────────────────────
    let parsedAmount   = 0;
    let parsedMerchant = 'Unknown Merchant';
    let parsedCategory = 'Auto-Captured';

    if (body.raw_sms) {
      const text = body.raw_sms;

      const amountMatch = text.match(/(?:Rs\.?|INR)\s*([\d,]+\.?\d*)/i);
      if (amountMatch) {
        parsedAmount = parseFloat(amountMatch[1].replace(/,/g, ''));
      }

      const merchantMatch = text.match(/To\s+(.+)/i);
      if (merchantMatch) {
        parsedMerchant = merchantMatch[1].trim();
      } else {
        parsedMerchant = 'Unparsed: ' + text.substring(0, 25);
      }
    } else {
      // Structured manual-entry format (amount/merchant/category fields)
      parsedAmount   = parseFloat(body.amount)   || 0;
      parsedMerchant = body.merchant              || 'Manual Entry';
      parsedCategory = body.category              || 'General';
    }

    // ── 3. Build and insert the transaction ─────────────────────────────────
    const transactionData = {
      user_id:  resolvedUserId,
      amount:   parsedAmount,
      merchant: parsedMerchant,
      category: parsedCategory,
      date:     body.date || new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
      const { error: insertError } = await supabaseAdmin
        .from('transactions')
        .insert([transactionData]);

      if (insertError) {
        console.error('Supabase insert error:', insertError.message);
        // Return 200 anyway so the caller's Shortcut/MacroDroid action doesn't retry
      }
    }

    return NextResponse.json(
      { success: true, data: transactionData },
      { status: 200, headers: CORS }
    );

  } catch (err) {
    console.error('Critical API Error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500, headers: CORS }
    );
  }
}
