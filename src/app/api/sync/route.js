import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

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

export async function POST(req) {
  try {
    const bodyText = await req.text();
    console.log("Raw Incoming Body:", bodyText); // This will show up in Vercel Logs!

    let body;
    try {
      body = JSON.parse(bodyText);
    } catch (e) {
      // JSON parse failed — treat entire body as raw_sms instead of returning 400
      console.log("JSON parse failed, treating body as raw_sms:", bodyText.substring(0, 80));
      body = { raw_sms: bodyText };
    }

    // Default fallback values
    let parsedAmount = 0;
    let parsedMerchant = "Unknown Merchant";
    let parsedCategory = "Auto-Captured";

    if (body.raw_sms) {
      // Attempt basic regex parsing, but don't fail if it doesn't match
      const text = body.raw_sms;
      const amountMatch = text.match(/Rs\.?\s*([\d,]+\.?\d*)/i);
      if (amountMatch) {
        parsedAmount = parseFloat(amountMatch[1].replace(/,/g, ''));
      }

      const merchantMatch = text.match(/to\s+([A-Za-z0-9\s]+?)(?:\.|\s+UPI|\s+Ref)/i);
      if (merchantMatch) {
        parsedMerchant = merchantMatch[1].trim();
      } else {
        // If merchant regex fails, save the raw text so we can debug it on the dashboard
        parsedMerchant = "Unparsed: " + text.substring(0, 25);
      }
    } else {
      // Handle structured manual entry format
      parsedAmount = parseFloat(body.amount) || 0;
      parsedMerchant = body.merchant || "Manual Entry";
      parsedCategory = body.category || "General";
    }

    const transactionData = {
      amount:   parsedAmount,
      merchant: parsedMerchant,
      category: parsedCategory,
      date:     body.date || new Date().toISOString(),
    };

    // Add user_id if provided
    if (body.user_id && typeof body.user_id === 'string' && body.user_id.trim()) {
      transactionData.user_id = body.user_id.trim();
    }

    console.log("Transaction to insert:", JSON.stringify(transactionData));

    // Insert into Supabase
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('transactions').insert([transactionData]);
      if (error) {
        console.error("Supabase Error:", error.message);
        // Still return 200 — don't fail the Shortcut
      } else {
        console.log("Supabase insert successful");
      }
    } else {
      console.log("Supabase not configured — local mode");
    }

    // ALWAYS return 200 OK
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
