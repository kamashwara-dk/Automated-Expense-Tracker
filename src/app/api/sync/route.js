import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

/**
 * Server-side admin client that bypasses RLS.
 * Used only for the sync_token → user_id lookup so the webhook
 * can authenticate without being tied to a logged-in session.
 */
const supabaseAdmin =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false } }
      )
    : null;

export async function GET() {
  return NextResponse.json({ success: true, message: "Valuta API is live." });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Requested-With',
    },
  });
}

/**
 * Resolve a sync_token string to the owning user_id.
 * Uses the service-role client so it can read profiles regardless of RLS.
 * Returns null if the token is not found or the admin client is unavailable.
 */
async function resolveUserIdFromToken(token) {
  if (!token || !supabaseAdmin) return null;

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('sync_token', token)
    .single();

  if (error || !data?.id) {
    console.warn('sync_token not found in profiles:', error?.message);
    return null;
  }

  return data.id;
}

export async function POST(req) {
  try {
    const bodyText = await req.text();
    console.log("Raw Incoming Body:", bodyText);

    let body;
    try {
      body = JSON.parse(bodyText);
    } catch (e) {
      console.log("JSON parse failed, treating body as raw_sms:", bodyText.substring(0, 80));
      body = { raw_sms: bodyText };
    }

    // ── Token Authentication ─────────────────────────────────────────────────
    // Accept token from:
    //   1. Authorization: Bearer <token>  header
    //   2. body.sync_token  JSON field
    // Fall back to legacy body.user_id for backward-compat (dev/testing only).
    let resolvedUserId = null;

    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const bodyToken = body.sync_token ? String(body.sync_token).trim() : null;

    const incomingToken = bearerToken || bodyToken;

    if (incomingToken) {
      resolvedUserId = await resolveUserIdFromToken(incomingToken);
      if (!resolvedUserId) {
        console.warn('Invalid or unrecognised sync_token provided.');
        // Still continue — we'll store without a user_id rather than break the caller's Shortcut
      }
    } else if (body.user_id && typeof body.user_id === 'string' && body.user_id.trim()) {
      // Legacy path: raw user_id sent directly (kept for dev convenience)
      resolvedUserId = body.user_id.trim();
      console.log("Using legacy user_id field:", resolvedUserId);
    }

    // ── SMS Parsing ───────────────────────────────────────────────────────────
    let parsedAmount = 0;
    let parsedMerchant = "Unknown Merchant";
    let parsedCategory = "Auto-Captured";

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
        parsedMerchant = "Unparsed: " + text.substring(0, 25);
      }
    } else {
      // Structured manual-entry format
      parsedAmount = parseFloat(body.amount) || 0;
      parsedMerchant = body.merchant || "Manual Entry";
      parsedCategory = body.category || "General";
    }

    // ── Build Transaction ─────────────────────────────────────────────────────
    const transactionData = {
      amount:   parsedAmount,
      merchant: parsedMerchant,
      category: parsedCategory,
      date:     body.date || new Date().toISOString(),
    };

    if (resolvedUserId) {
      transactionData.user_id = resolvedUserId;
    }

    console.log("Transaction to insert:", JSON.stringify(transactionData));

    // ── Persist to Supabase ───────────────────────────────────────────────────
    if (isSupabaseConfigured) {
      // Use the admin client so the insert works regardless of RLS policies
      const client = supabaseAdmin || supabase;
      const { error } = await client.from('transactions').insert([transactionData]);
      if (error) {
        console.error("Supabase Error:", error.message);
      } else {
        console.log("Supabase insert successful");
      }
    } else {
      console.log("Supabase not configured — local mode");
    }

    // ALWAYS return 200 OK so the caller's Shortcut/Tasker action doesn't fail
    return NextResponse.json(
      { success: true, data: transactionData },
      {
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
      }
    );

  } catch (error) {
    console.error("Critical API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
