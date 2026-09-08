"use client";

import { SectionError } from "@/components/states/section-error";

export default function DashboardError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <SectionError {...props} title="The business workspace could not load" />;
}
