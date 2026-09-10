"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const subscribe = () => () => {};

export function ThemeMenu({ onThemeChange }: { onThemeChange?: () => void }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const selected = mounted ? (theme ?? "light") : "light";
  const CurrentIcon = mounted && resolvedTheme === "dark" ? Moon : Sun;

  function handleThemeChange(next: string) {
    setTheme(next);
    queueMicrotask(() => onThemeChange?.());
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11"
          aria-label={`Color theme: ${selected}`}
          data-mounted={mounted ? "true" : "false"}
        >
          <CurrentIcon className="size-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[60] min-w-40">
        <DropdownMenuLabel>Color theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={selected} onValueChange={handleThemeChange}>
          <DropdownMenuRadioItem
            value="light"
            aria-label="Light"
            onSelect={() => queueMicrotask(() => onThemeChange?.())}
          >
            <Sun className="size-4" aria-hidden />
            Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="dark"
            aria-label="Dark"
            onSelect={() => queueMicrotask(() => onThemeChange?.())}
          >
            <Moon className="size-4" aria-hidden />
            Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="system"
            aria-label="System"
            onSelect={() => queueMicrotask(() => onThemeChange?.())}
          >
            <Monitor className="size-4" aria-hidden />
            System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
