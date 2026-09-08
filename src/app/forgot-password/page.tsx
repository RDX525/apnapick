import { buildPageMetadata } from "@/lib/seo/metadata";
import { hasSupabaseConfig } from "@/config/env";
import { AuthShell } from "@/features/auth/auth-shell";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "Reset password",
  description: "Request a secure ApnaPick password reset link",
  path: "/forgot-password",
  noIndex: true,
});

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Reset your password"
      description="Enter your account email and we’ll send a secure, time-limited reset link."
    >
      <ForgotPasswordForm configured={hasSupabaseConfig()} />
    </AuthShell>
  );
}
