/**
 * Central place to read environment variables.
 *
 * - `publicEnv` is safe in the browser (only NEXT_PUBLIC_* values).
 * - `serverEnv()` must only be called from server code (route handlers,
 *   server components, server actions). It throws a clear error when a
 *   required secret is missing instead of failing somewhere deep inside an SDK.
 */

export const publicEnv = {
  appUrl: (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    "",
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
};

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Add it to .env.local (local) and Vercel project settings (deployed).`,
    );
  }
  return value;
}

export function serverEnv() {
  return {
    supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
    stripeSecretKey: required("STRIPE_SECRET_KEY"),
    stripeWebhookSecret: required("STRIPE_WEBHOOK_SECRET"),
    anthropicApiKey: required("ANTHROPIC_API_KEY"),
    resendApiKey: required("RESEND_API_KEY"),
    emailFrom: process.env.EMAIL_FROM ?? "TaDa <hello@mail.gettada.me>",
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? "",
    vapidSubject: process.env.VAPID_SUBJECT ?? "mailto:clientcare@gettada.me",
  };
}

/** True when the browser-side Supabase config is present. Useful for friendly setup messages. */
export const supabaseConfigured = Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);
