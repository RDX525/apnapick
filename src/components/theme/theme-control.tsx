"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const options = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

const subscribe = () => () => {};

export function ThemeControl() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const selected = mounted ? (theme ?? "system") : "system";

  return (
    <div
      className="border-border bg-muted/70 grid grid-cols-3 gap-1 rounded-2xl border p-1.5 shadow-inner"
      role="radiogroup"
      aria-label="Color theme"
    >
      {options.map(({ value, label, icon: Icon }) => {
        const active = selected === value;
        return (
          <label key={value} className="relative cursor-pointer">
            <input
              type="radio"
              name="color-theme"
              value={value}
              checked={active}
              onChange={() => setTheme(value)}
              className="peer sr-only"
            />
            <span
              className={cn(
                "peer-focus-visible:ring-ring peer-focus-visible:ring-offset-background flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium transition-all duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2",
                active
                  ? "bg-card text-foreground ring-border shadow-sm ring-1"
                  : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden />
              <span>{label}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
