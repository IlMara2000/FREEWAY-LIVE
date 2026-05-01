# FREEWAY LIVE

React/Vite app for planning tasks, saving brain dumps, running focus sessions, and tracking account XP.

## Local Development

1. Install dependencies:

```sh
npm install
```

2. Create `.env.local` with the required public client configuration:

```sh
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
GROQ_API_KEY=your_groq_server_key
```

`GROQ_API_KEY` is used only by the local dev middleware and Vercel serverless API route. Do not expose it with a `VITE_` prefix.
If an older environment already has `NEXT_PUBLIC_GROQ_API_KEY`, rename it to `GROQ_API_KEY`.

3. Run the app:

```sh
npm run dev
```

## Build

```sh
npm run build
```
