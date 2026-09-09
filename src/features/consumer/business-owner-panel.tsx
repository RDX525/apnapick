"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { loadBusinessViewer } from "@/features/consumer/business-viewer";

export function BusinessOwnerPanel({
  businessId,
  isClaimed,
}: {
  businessId: string;
  isClaimed: boolean;
}) {
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadBusinessViewer(businessId).then((viewer) => {
      if (!cancelled && viewer?.isOwner) setIsOwner(true);
    });
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  return (
    <div className="border-border/70 bg-mist rounded-2xl border p-5">
      <p className="text-muted-foreground text-sm">
        {isOwner
          ? "Keep this listing accurate for customers."
          : isClaimed
            ? "See something that needs correcting?"
            : "Do you manage this business?"}
      </p>
      <Button asChild variant="outline" className="mt-3 min-h-10 w-full">
        <Link
          href={
            isOwner
              ? "/business/dashboard/profile"
              : isClaimed
                ? "/help"
                : "/business/onboarding"
          }
        >
          {isOwner
            ? "Manage listing"
            : isClaimed
              ? "Suggest an edit"
              : "Claim this business"}
        </Link>
      </Button>
    </div>
  );
}
