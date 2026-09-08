"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { friendlyAuthError } from "@/features/auth/auth-errors";

export function ResetPasswordForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [sessionStatus, setSessionStatus] = useState<"checking" | "valid" | "invalid">(
    configured ? "checking" : "valid",
  );

  useEffect(() => {
    if (!configured) return;
    let active = true;
    void import("@/lib/db/supabase-browser")
      .then(({ createBrowserSupabaseClient }) =>
        createBrowserSupabaseClient().auth.getSession(),
      )
      .then(({ data, error: sessionError }) => {
        if (!active) return;
        setSessionStatus(!sessionError && data.session ? "valid" : "invalid");
      })
      .catch(() => {
        if (active) setSessionStatus("invalid");
      });
    return () => {
      active = false;
    };
  }, [configured]);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      if (!configured) {
        if (process.env.NODE_ENV === "development") {
          router.replace("/login");
        } else {
          setError(
            "Password updates are temporarily unavailable. Please try again later.",
          );
        }
        return;
      }

      try {
        const { createBrowserSupabaseClient } = await import("@/lib/db/supabase-browser");
        const supabase = createBrowserSupabaseClient();
        const { error: updateError } = await supabase.auth.updateUser({
          password,
        });

        if (updateError) {
          setError(
            friendlyAuthError(
              updateError,
              "Unable to update your password. Request a new reset link.",
            ),
          );
          return;
        }
        router.replace("/login");
        router.refresh();
      } catch (err) {
        setError(
          friendlyAuthError(
            err,
            "Unable to update your password. Request a new reset link.",
          ),
        );
      }
    });
  }

  const fields = [
    {
      id: "new-password",
      label: "New password",
      value: password,
      setValue: setPassword,
    },
    {
      id: "confirm-password",
      label: "Confirm password",
      value: confirmation,
      setValue: setConfirmation,
    },
  ];

  if (sessionStatus === "checking") {
    return (
      <div
        role="status"
        className="ap-glass-premium text-muted-foreground mt-8 rounded-[1.75rem] p-6 text-sm"
      >
        Verifying your secure reset link…
      </div>
    );
  }

  if (sessionStatus === "invalid") {
    return (
      <div role="alert" className="ap-glass-premium mt-8 space-y-4 rounded-[1.75rem] p-6">
        <p className="text-destructive text-sm">
          This reset link is invalid or has expired.
        </p>
        <Button asChild>
          <Link href="/forgot-password">Request a new reset link</Link>
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="ap-glass-premium mt-8 space-y-5 rounded-[1.75rem] p-6 sm:p-7"
    >
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      {fields.map((field) => (
        <div key={field.id} className="space-y-2">
          <Label htmlFor={field.id} className="font-semibold">
            {field.label}
          </Label>
          <div className="relative">
            <LockKeyhole
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
              aria-hidden
            />
            <Input
              id={field.id}
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              value={field.value}
              onChange={(event) => field.setValue(event.target.value)}
              placeholder="At least 8 characters"
              className="min-h-12 pr-11 pl-10"
            />
            <button
              type="button"
              className="text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none"
              aria-label={showPassword ? "Hide passwords" : "Show passwords"}
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
      ))}

      <p className="text-muted-foreground flex items-center gap-2 text-xs">
        <Check className="text-sea size-3.5" aria-hidden />
        Use at least 8 characters and avoid reused passwords.
      </p>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
