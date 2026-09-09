import { Suspense } from "react";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { LoginForm } from "@/features/auth/login-form";
import { AuthShell } from "@/features/auth/auth-shell";
import { hasSupabaseConfig } from "@/config/env";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "Log in",
  description: "Log in to ApnaPick",
  path: "/login",
  noIndex: true,
});

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Own a local business?"
      title="Welcome back"
      description="Log in to manage your listing in Kharadi, Wagholi, or Lohegaon."
    >
      <Suspense
        fallback={<div className="bg-mist mt-8 h-64 animate-pulse rounded-2xl" />}
      >
        <LoginForm configured={hasSupabaseConfig()} />
      </Suspense>
    </AuthShell>
  );
}
