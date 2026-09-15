import { PasswordForm } from "./password-form";

export const metadata = { title: "Set password" };

export default function PasswordPage() {
  return (
    <main className="mx-auto w-full max-w-sm">
      <h1 className="text-2xl font-extrabold tracking-tight text-navy">Set a new password</h1>
      <p className="mt-1 text-sm text-fade">You&rsquo;ll use this with your email the next time you sign in.</p>
      <div className="mt-5">
        <PasswordForm />
      </div>
    </main>
  );
}
