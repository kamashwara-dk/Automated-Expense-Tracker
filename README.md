# My Valuta — Automated Expense Tracker

A mobile-first PWA for automated personal expense tracking with real-time financial intelligence.

## Features

- **Automated Sync** via webhook — connect Tasker (Android) or iOS Shortcuts to auto-log expenses
- **Manual Entry** — add expenses instantly from the dashboard
- **Dashboard** — 7-day velocity, daily alert limit, monthly budget cap, smart insights
- **Insights Tab** — 6-month trend chart, top merchants, category breakdown, spending patterns
- **Transaction History** — searchable, filterable, grouped by date, with edit/delete
- **CSV Export** — download your transaction data anytime
- **Realtime Sync** — new webhook transactions appear live without refresh (Supabase Realtime)
- **PWA** — installable on Android (Chrome) and iOS (Safari Add to Home Screen), offline-capable
- **Multi-currency** — display formatting across 10 currencies
- **Persistent settings** — budget cap, daily limit, and currency selection saved to localStorage
- **Guest mode** — works fully offline without a Supabase account

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **React 19** + Tailwind CSS v4
- **Supabase** (Auth + Postgres + Realtime)
- **Recharts** for data visualization
- **lucide-react** icons

## Setup

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. Run the Supabase SQL to create the transactions table:
   ```sql
   create table transactions (
     id uuid default gen_random_uuid() primary key,
     user_id uuid references auth.users(id),
     amount numeric not null,
     merchant text not null,
     category text not null,
     date timestamptz not null,
     created_at timestamptz default now()
   );

   -- Enable Row Level Security
   alter table transactions enable row level security;

   create policy "Users can manage own transactions"
     on transactions for all
     using (auth.uid() = user_id);
   ```

4. Start the dev server:
   ```bash
   npm run dev
   ```

## Webhook API

**POST** `/api/sync`

```json
{
  "amount": 18.50,
  "merchant": "Subway",
  "category": "Food & Dining",
  "date": "2026-08-04T12:00:00.000Z",
  "user_id": "your-supabase-user-id"
}
```

Valid categories: `Food & Dining`, `Shopping`, `Transportation`, `Bills & Utilities`, `Entertainment`, `Healthcare`, `Personal Care`, `Subscriptions`, `Other`

### iOS Shortcuts
Use a **"Get Contents of URL"** action: method POST, request body JSON with the fields above.

### Android Tasker
Use an **HTTP Request** task pointing to your deployed URL.

## PWA Icons

Icons are pre-generated in `/public`. To regenerate:
```bash
node scripts/make-icons.mjs
```

## Build

```bash
npm run build
npm start
```
