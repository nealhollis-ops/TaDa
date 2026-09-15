# Branded auth emails

Paste each file into Supabase > Authentication > Emails > Templates, replacing
the default template, and set the subject line shown below. Do this once.

These templates link straight to the app's own confirm route using a token
hash, so a link still works when it is opened on a different device from the
one that requested it (for example, requested on a laptop, opened on a phone).

Before pasting, make sure Supabase > Authentication > URL Configuration has:

- Site URL: `https://app.gettada.me`
- Redirect URLs: `https://app.gettada.me/auth/callback`, `https://app.gettada.me/auth/confirm`,
  `http://localhost:3000/auth/callback`, `http://localhost:3000/auth/confirm`

| Template          | File                  | Subject                              |
| ----------------- | --------------------- | ------------------------------------ |
| Confirm sign up   | `confirm-signup.html` | Confirm your TaDa account            |
| Magic Link        | `magic-link.html`     | Your TaDa sign-in link               |
| Reset Password    | `recovery.html`       | Reset your TaDa password             |
| Invite user       | `invite.html`         | You're invited to TaDa               |

The "Change Email Address" template can stay on Supabase's default for now.
