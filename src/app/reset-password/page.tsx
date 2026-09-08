import { buildPageMetadata } from "@/lib/seo/metadata";
import { hasSupabaseConfig } from "@/config/env";
import { AuthShell } from "@/features/auth/auth-shell";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "Choose a new password",
  description: "Set a new password for your ApnaPick account",
  path: "/reset-password",
  noIndex: true,
});

export default function ResetPasswordPage() {
  return (
    <AuthShell
      eyebrow="Secure recovery"
      title="Choose a new password"
      description="Create a strong password you don’t use for another account."
    >
      <ResetPasswordForm configured={hasSupabaseConfig()} />
    </AuthShell>
  );
}
