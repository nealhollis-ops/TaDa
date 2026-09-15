import { NextResponse } from "next/server";

/**
 * GET /api/health
 * Quick deploy check: confirms the app is up and which env vars are present.
 * Reports presence only, never values.
 */
export async function GET() {
  const present = (name: string) => Boolean(process.env[name]);
  return NextResponse.json({
    ok: true,
    app: "tada",
    time: new Date().toISOString(),
    env: {
      NEXT_PUBLIC_APP_URL: present("NEXT_PUBLIC_APP_URL"),
      NEXT_PUBLIC_SUPABASE_URL: present("NEXT_PUBLIC_SUPABASE_URL"),
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        present("NEXT_PUBLIC_SUPABASE_ANON_KEY") || present("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
      SUPABASE_SERVICE_ROLE_KEY: present("SUPABASE_SERVICE_ROLE_KEY"),
      STRIPE_SECRET_KEY: present("STRIPE_SECRET_KEY"),
      STRIPE_WEBHOOK_SECRET: present("STRIPE_WEBHOOK_SECRET"),
      ANTHROPIC_API_KEY: present("ANTHROPIC_API_KEY"),
      RESEND_API_KEY: present("RESEND_API_KEY"),
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: present("NEXT_PUBLIC_VAPID_PUBLIC_KEY"),
      VAPID_PRIVATE_KEY: present("VAPID_PRIVATE_KEY"),
      CRON_SECRET: present("CRON_SECRET"),
    },
  });
}
