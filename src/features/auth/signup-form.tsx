"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { safeAuthNextPath } from "@/lib/security/safe-redirect";
import { friendlyAuthError } from "@/features/auth/auth-errors";

export function SignupForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeAuthNextPath(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      if (!configured) {
        if (process.env.NODE_ENV === "development") {
          router.replace(next);
        } else {
          setError(
            "Account creation is temporarily unavailable. Please try again later.",
          );
        }
        return;
      }
      try {
        const { createBrowserSupabaseClient } = await import("@/lib/db/supabase-browser");
        const supabase = createBrowserSupabaseClient();
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: name },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (authError) {
          setError(
            friendlyAuthError(authError, "Unable to create your account. Try again."),
          );
          return;
        }
        if (data.session) {
          router.replace(next);
          router.refresh();
          return;
        }
        setMessage("Check your email to confirm your account, then log in.");
      } catch (err) {
        setError(friendlyAuthError(err, "Unable to create your account. Try again."));
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="ap-glass-premium mt-8 space-y-5 rounded-[1.75rem] p-6 sm:p-7"
    >
      {process.env.NODE_ENV === "development" && !configured ? (
        <p className="ap-inset text-muted-foreground rounded-xl px-3 py-2.5 text-xs leading-relaxed">
          Supabase Auth is not configured. Continue starts onboarding for local
          development.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="text-sea text-sm">
          {message}
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="name" className="font-semibold">
          Your name
        </Label>
        <div className="relative">
          <UserRound
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-h-12 pl-10"
            placeholder="Your full name"
            autoComplete="name"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email" className="font-semibold">
          Email address
        </Label>
        <div className="relative">
          <Mail
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-12 pl-10"
            placeholder="you@business.com"
            autoComplete="email"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="font-semibold">
          Password
        </Label>
        <div className="relative">
          <LockKeyhole
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            aria-describedby="password-help"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="min-h-12 pr-11 pl-10"
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
          <button
            type="button"
            className="text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-lg focus-visible:ring-2 focus-visible:outline-none"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((visible) => !visible)}
          >
            {showPassword ? (
              <EyeOff className="size-4" aria-hidden />
            ) : (
              <Eye className="size-4" aria-hidden />
            )}
          </button>
        </div>
        <p
          id="password-help"
          className="text-muted-foreground flex items-center gap-2 text-xs"
        >
          <Check
            className={password.length >= 8 ? "text-success size-3.5" : "size-3.5"}
            aria-hidden
          />
          Use at least 8 characters and avoid a password used elsewhere.
        </p>
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Creating…" : "Create account & list business"}
      </Button>
      <p className="border-border/70 text-muted-foreground border-t pt-5 text-center text-sm">
        Already have an account?{" "}
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          className="text-sea hover:underline"
        >
          Log in
        </Link>
      </p>
    </form>
  );
}
