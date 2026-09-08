import { Suspense } from "react";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { SignupForm } from "@/features/auth/signup-form";
import { AuthShell } from "@/features/auth/auth-shell";
import { hasSupabaseConfig } from "@/config/env";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "Sign up",
  description: "Create an ApnaPick account and list your business",
  path: "/signup",
  noIndex: true,
});

export default function SignupPage() {
  return (
    <AuthShell
      eyebrow="Join ApnaPick"
      title="List your business"
      description="Create an account to claim or add your Pune business on ApnaPick."
    >
      <Suspense
        fallback={<div className="bg-mist mt-8 h-72 animate-pulse rounded-2xl" />}
      >
        <SignupForm configured={hasSupabaseConfig()} />
      </Suspense>
    </AuthShell>
  );
}
