"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { friendlyAuthError } from "@/features/auth/auth-errors";

export function ForgotPasswordForm({ configured }: { configured: boolean }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      if (!configured) {
        if (process.env.NODE_ENV === "development") {
          setSent(true);
        } else {
          setError(
            "Password recovery is temporarily unavailable. Please try again later.",
          );
        }
        return;
      }

      try {
        const { createBrowserSupabaseClient } = await import("@/lib/db/supabase-browser");
        const supabase = createBrowserSupabaseClient();
        const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo,
        });

        if (resetError) {
          setError(
            friendlyAuthError(
              resetError,
              "Unable to send a reset email. Please try again.",
            ),
          );
          return;
        }
        setSent(true);
      } catch (err) {
        setError(
          friendlyAuthError(err, "Unable to send a reset email. Please try again."),
        );
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="ap-glass-premium mt-8 space-y-5 rounded-[1.75rem] p-6 sm:p-7"
    >
      {sent ? (
        <div role="status" className="ap-status-success rounded-2xl border p-4">
          <p className="font-semibold">Check your inbox</p>
          <p className="mt-1 text-sm">
            If an account exists for {email}, a secure reset link is on its way.
          </p>
        </div>
      ) : (
        <>
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="reset-email" className="font-semibold">
              Email address
            </Label>
            <div className="relative">
              <Mail
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                id="reset-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@business.com"
                className="min-h-12 pl-10"
              />
            </div>
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Sending…" : "Send secure reset link"}
          </Button>
        </>
      )}

      <p className="text-muted-foreground flex items-center justify-center gap-2 text-xs">
        <ShieldCheck className="text-sea size-3.5" aria-hidden />
        Reset links are time-limited for your protection
      </p>
      <p className="border-border/70 text-muted-foreground border-t pt-5 text-center text-sm">
        Remembered it?{" "}
        <Link href="/login" className="text-sea font-medium hover:underline">
          Back to login
        </Link>
      </p>
    </form>
  );
}
