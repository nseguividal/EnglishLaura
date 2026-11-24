# Cambridge English Exam Preparation

Full-stack web application for preparing for the Cambridge **B2 First** and **C1 Advanced** exams, built with Next.js (App Router), TypeScript, Tailwind CSS, Recharts, and Supabase.

## Setup & Run Locally

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Supabase:**
   - Create a project at [supabase.com](https://supabase.com).
   - In the Supabase **SQL Editor**, run `supabase/schema.sql` (and optionally `supabase/seed.sql` for sample content).

3. **Set environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   Fill in Supabase API keys in `.env.local`.

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Verify Build

```bash
npx tsc --noEmit && npm run lint && npm run build
```

## Deploy to Vercel

Import this repository on [Vercel](https://vercel.com), add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in **Project Settings → Environment Variables**, and deploy.
