"use client";

import { SectionError } from "@/components/states/section-error";

export default function AdminError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <SectionError {...props} title="The admin console could not load" />;
}
