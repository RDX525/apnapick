"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import type { SpecialHoursEntry } from "@/domain/onboarding/types";
import { useDashboard } from "@/features/dashboard/dashboard-provider";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function HoursManagerPage() {
  const { workspace, update } = useDashboard();

  return (
    <DashboardShell
      activePath="/business/dashboard/hours"
      title="Hours"
      description="Weekly hours, special days, and temporary closure."
    >
      <label className="border-border/70 bg-card flex items-center justify-between gap-3 rounded-2xl border px-4 py-4">
        <div>
          <p className="font-medium">Temporarily closed</p>
          <p className="text-muted-foreground text-sm">
            Hides open-now availability until you reopen.
          </p>
        </div>
        <Switch
          aria-label="Temporarily closed"
          checked={workspace.temporarilyClosed}
          onCheckedChange={(temporarilyClosed) =>
            update((w) => ({ ...w, temporarilyClosed }))
          }
        />
      </label>

      <ul className="space-y-2">
        {workspace.hours
          .slice()
          .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
          .map((h) => (
            <li
              key={h.dayOfWeek}
              className="border-border/70 bg-card grid gap-3 rounded-2xl border p-4 sm:grid-cols-[8rem_auto_1fr_1fr]"
            >
              <p className="font-medium">{DAYS[h.dayOfWeek]}</p>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={h.isClosed}
                  onCheckedChange={(checked) =>
                    update((w) => ({
                      ...w,
                      hours: w.hours.map((x) =>
                        x.dayOfWeek === h.dayOfWeek
                          ? { ...x, isClosed: checked === true }
                          : x,
                      ),
                    }))
                  }
                />
                Closed
              </label>
              {!h.isClosed ? (
                <>
                  <Input
                    type="time"
                    aria-label={`${DAYS[h.dayOfWeek]} opening time`}
                    value={h.opensAt ?? ""}
                    onChange={(e) =>
                      update((w) => ({
                        ...w,
                        hours: w.hours.map((x) =>
                          x.dayOfWeek === h.dayOfWeek
                            ? { ...x, opensAt: e.target.value }
                            : x,
                        ),
                      }))
                    }
                    className="min-h-10"
                  />
                  <Input
                    type="time"
                    aria-label={`${DAYS[h.dayOfWeek]} closing time`}
                    value={h.closesAt ?? ""}
                    onChange={(e) =>
                      update((w) => ({
                        ...w,
                        hours: w.hours.map((x) =>
                          x.dayOfWeek === h.dayOfWeek
                            ? { ...x, closesAt: e.target.value }
                            : x,
                        ),
                      }))
                    }
                    className="min-h-10"
                  />
                </>
              ) : (
                <p className="text-muted-foreground text-sm sm:col-span-2">—</p>
              )}
            </li>
          ))}
      </ul>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-medium">Special hours & holidays</h2>
            <p className="text-muted-foreground text-sm">
              Override a specific date without changing the weekly schedule.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const entry: SpecialHoursEntry = {
                date: new Date().toISOString().slice(0, 10),
                label: "Holiday",
                isClosed: true,
              };
              update((w) => ({
                ...w,
                specialHours: [...w.specialHours, entry],
              }));
            }}
          >
            Add special day
          </Button>
        </div>
        <ul className="space-y-2">
          {workspace.specialHours.map((s, idx) => (
            <li
              key={`${s.date}-${idx}`}
              className="border-border/70 bg-mist/40 grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_1fr_auto]"
            >
              <div className="space-y-1">
                <Label htmlFor={`special-date-${idx}`} className="text-xs">
                  Date
                </Label>
                <Input
                  id={`special-date-${idx}`}
                  type="date"
                  value={s.date}
                  onChange={(e) =>
                    update((w) => ({
                      ...w,
                      specialHours: w.specialHours.map((x, i) =>
                        i === idx ? { ...x, date: e.target.value } : x,
                      ),
                    }))
                  }
                  className="min-h-10"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`special-label-${idx}`} className="text-xs">
                  Label
                </Label>
                <Input
                  id={`special-label-${idx}`}
                  value={s.label ?? ""}
                  onChange={(e) =>
                    update((w) => ({
                      ...w,
                      specialHours: w.specialHours.map((x, i) =>
                        i === idx ? { ...x, label: e.target.value } : x,
                      ),
                    }))
                  }
                  className="min-h-10"
                />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 pb-2 text-sm">
                  <Checkbox
                    checked={s.isClosed}
                    onCheckedChange={(checked) =>
                      update((w) => ({
                        ...w,
                        specialHours: w.specialHours.map((x, i) =>
                          i === idx ? { ...x, isClosed: checked === true } : x,
                        ),
                      }))
                    }
                  />
                  Closed
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    update((w) => ({
                      ...w,
                      specialHours: w.specialHours.filter((_, i) => i !== idx),
                    }))
                  }
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </DashboardShell>
  );
}
