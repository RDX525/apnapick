"use client";

import { MapPin } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AREA_CENTROIDS, DISCOVERY_AREA_SLUGS } from "@/config/geo-areas";
import {
  CURRENT_LOCATION_LABEL,
  CURRENT_LOCATION_VALUE,
  isCurrentLocationValue,
} from "@/lib/geo/device-location";
import { cn } from "@/lib/utils";

type AreaSelectProps = {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  locating?: boolean;
  variant?: "default" | "chip";
  className?: string;
};

function areaLabel(value: string, locating?: boolean) {
  if (locating) return "Locating…";
  if (isCurrentLocationValue(value)) return CURRENT_LOCATION_LABEL;
  return AREA_CENTROIDS[value]?.label ?? "Pune";
}

export function AreaSelect({
  id,
  value,
  onChange,
  locating = false,
  variant = "default",
  className,
}: AreaSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        id={id}
        size="default"
        className={cn(
          variant === "chip"
            ? "bg-secondary/70 ring-sea/10 h-11 w-auto min-w-[10.5rem] rounded-full border-0 px-3 shadow-none ring-1"
            : "bg-secondary/75 w-full",
          className,
        )}
      >
        <MapPin className="text-sea size-3.5" aria-hidden />
        <SelectValue placeholder={CURRENT_LOCATION_LABEL}>
          {areaLabel(value, locating)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent position="popper" align="end">
        <SelectItem value={CURRENT_LOCATION_VALUE}>{CURRENT_LOCATION_LABEL}</SelectItem>
        {DISCOVERY_AREA_SLUGS.map((slug) => (
          <SelectItem key={slug} value={slug}>
            {AREA_CENTROIDS[slug]?.label ?? slug}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
