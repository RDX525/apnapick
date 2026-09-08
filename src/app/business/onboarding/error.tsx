"use client";

import { SectionError } from "@/components/states/section-error";

export default function OnboardingError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <SectionError {...props} title="Onboarding could not continue" />;
}
