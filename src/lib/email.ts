import { Resend } from "resend";
import { serverEnv } from "./env";

/**
 * One branded shell and one send, for the emails TaDa writes itself.
 *
 * Resend was being newed up with its own inline table markup in each place that
 * needed it; a third and fourth copy would have guaranteed four slightly
 * different TaDa emails. The two older senders (team invites, comp invites)
 * still carry their own markup and can move here when either is next touched.
 */

const INK = "#111111";
const CREAM = "#F5F5F5";
const FADE = "#666666";
const CORAL = "#E30022";
const GOLD = "#F8B018";

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
}

type Shell = {
  /** The line in large type at the top. Already escaped by the caller if it carries a name. */
  heading: string;
  /** Paragraphs, in order. Each is already escaped. */
  paragraphs: string[];
  cta?: { label: string; href: string };
  /** Small print under the button. */
  footer?: string;
};

export function emailShell({ heading, paragraphs, cta, footer }: Shell): string {
  const body = paragraphs
    .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${INK};">${p}</p>`)
    .join("");
  const button = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 6px;"><tr><td style="background:${CORAL};border-radius:12px;">
<a href="${cta.href}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">${cta.label}</a></td></tr></table>`
    : "";
  const small = footer ? `<p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:${FADE};">${footer}</p>` : "";
  return `<!doctype html><html><body style="margin:0;padding:0;background:${CREAM};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:28px;">
<tr><td style="padding-bottom:4px;font-size:13px;font-weight:700;letter-spacing:1px;color:${GOLD};">TADA!</td></tr>
<tr><td style="padding-bottom:14px;font-family:Georgia,serif;font-style:italic;font-size:24px;line-height:1.25;color:${INK};">${heading}</td></tr>
<tr><td>${body}${button}${small}</td></tr>
</table>
<p style="max-width:520px;margin:16px auto 0;font-size:12px;line-height:1.6;color:${FADE};">You are getting this because you have a TaDa account.</p>
</td></tr></table></body></html>`;
}

/** Sends, and says in the log when it could not. Never throws at the caller. */
export async function sendEmail(to: string | string[], subject: string, html: string, text: string): Promise<boolean> {
  try {
    const env = serverEnv();
    const { error } = await new Resend(env.resendApiKey).emails.send({ from: env.emailFrom, to, subject, html, text });
    if (error) {
      console.error("email send", subject, error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("email send", subject, err);
    return false;
  }
}
