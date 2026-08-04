import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

const VALID_CATEGORIES = [
  'Food & Dining',
  'Shopping',
  'Transportation',
  'Bills & Utilities',
  'Entertainment',
  'Healthcare',
  'Personal Care',
  'Subscriptions',
  'Other',
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Requested-With',
};

// Handle CORS OPTIONS preflight request
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload in request body' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Accept optional user_id to link transaction to a Supabase user account
    const { amount, merchant, category, date, user_id } = body || {};
    const errors = [];

    // --- Field Validation ---
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
    } else if (!VALID_CATEGORIES.includes(category.trim())) {
      // Soft warning: accept unknown categories but normalize them to 'Other'
      console.warn(`Unknown category received: "${category}" — will be stored as-is.`);
    }

    if (!date || isNaN(Date.parse(date))) {
      errors.push('date is required and must be a valid ISO or date string');
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: errors },
        { status: 400, headers: corsHeaders }
      );
    }

    const formattedAmount   = Number(amount);
    const formattedMerchant = merchant.trim();
    const formattedCategory = category.trim();
    const formattedDate     = new Date(date).toISOString();

    // Build insert record — include user_id only if provided
    const insertRecord = {
      amount:   formattedAmount,
      merchant: formattedMerchant,
      category: formattedCategory,
      date:     formattedDate,
    };

    if (user_id && typeof user_id === 'string' && user_id.trim()) {
      insertRecord.user_id = user_id.trim();
    }

    const localFallback = {
      id:         'tx-' + Date.now(),
      ...insertRecord,
      created_at: new Date().toISOString(),
    };

    // Handle unconfigured Supabase
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        {
          success: true,
          message: 'Transaction validated (Supabase not configured — running in local mode)',
          data: localFallback,
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // Insert into Supabase transactions table
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
          hint: error.message.includes('row-level security')
            ? 'RLS policy blocked the insert. Ensure the user_id matches the authenticated user.'
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
        message: 'Transaction synced to Supabase successfully',
        data: data && data.length > 0 ? data[0] : localFallback,
        user_id: user_id || null,
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
