"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { safeAuthNextPath } from "@/lib/security/safe-redirect";
import { friendlyAuthError } from "@/features/auth/auth-errors";
import { establishEmailPasswordSession } from "@/features/auth/email-password-auth";
import {
  navigateAfterAuth,
  resolveOwnerHome,
} from "@/features/auth/auth-redirect";

export function LoginForm({ configured }: { configured: boolean }) {
  const params = useSearchParams();
  const requestedNext = params.get("next");
  const next = safeAuthNextPath(requestedNext, "/business/onboarding");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setError(null);
    setPending(true);
    let navigating = false;
    try {
      if (!configured) {
        if (process.env.NODE_ENV === "development") {
          navigating = true;
          navigateAfterAuth(next);
        } else {
          setError("Authentication is temporarily unavailable. Please try again later.");
        }
        return;
      }
      const { createBrowserSupabaseClient } = await import("@/lib/db/supabase-browser");
      const supabase = createBrowserSupabaseClient();
      const outcome = await establishEmailPasswordSession(supabase.auth, {
        email,
        password,
        mode: "login",
      });
        if (outcome.status === "authenticated") {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          const [{ data: roleRows }, { data: memberships }] = user
            ? await Promise.all([
                supabase.from("user_roles").select("role").eq("user_id", user.id),
                supabase
                  .from("business_members")
                  .select("business_id")
                  .eq("user_id", user.id)
                  .limit(1),
              ])
            : [
                { data: null },
                { data: null },
              ];
          const destination = resolveOwnerHome({
            requestedNext,
            roles: (roleRows ?? []).map((row) => String(row.role)),
            hasListing: (memberships?.length ?? 0) > 0,
          });
          navigating = true;
          navigateAfterAuth(destination);
          return;
        }
      if (outcome.status === "needs_confirmation") {
        setError(
          "Confirm your email before signing in. Check your inbox (and spam) for the link.",
        );
        return;
      }
      setError(outcome.message);
    } catch (err) {
      setError(friendlyAuthError(err, "Unable to sign in. Try again."));
    } finally {
      submitting.current = false;
      if (!navigating) setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="ap-glass-premium mt-8 space-y-5 rounded-[1.75rem] p-6 sm:p-7"
    >
      {process.env.NODE_ENV === "development" && !configured ? (
        <p className="ap-inset text-muted-foreground rounded-xl px-3 py-2.5 text-xs leading-relaxed">
          Supabase Auth is not configured. Continue opens the business area for local
          development.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
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
            name="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@business.com"
            className="min-h-12 pl-10"
          />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="password" className="font-semibold">
            Password
          </Label>
          <Link
            href="/forgot-password"
            className="text-sea text-xs font-medium hover:underline hover:underline-offset-4"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <LockKeyhole
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            name="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="min-h-12 pr-12 pl-10"
          />
          <button
            type="button"
            className="text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none"
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
      </div>
      <Button type="submit" size="lg" className="ap-cta-glow w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in securely"}
      </Button>
      <p className="text-muted-foreground flex items-center justify-center gap-2 text-xs">
        <ShieldCheck className="text-sea size-3.5" aria-hidden />
        Encrypted authentication · no password sharing
      </p>
      <p className="border-border/70 text-muted-foreground border-t pt-5 text-center text-sm">
        New here?{" "}
        <Link
          href={`/signup?next=${encodeURIComponent(next)}`}
          className="text-sea hover:underline"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
