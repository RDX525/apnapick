import { cn } from "@/lib/utils";

const STEPS = [
  { id: "account", label: "Create account" },
  { id: "list", label: "List your business" },
  { id: "dashboard", label: "Manage in the dashboard" },
] as const;

export function OwnerJourneySteps({
  current,
}: {
  current: (typeof STEPS)[number]["id"];
}) {
  return (
    <ol className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {STEPS.map((step, index) => {
        const active = step.id === current;
        return (
          <li
            key={step.id}
            className={cn(
              active ? "text-foreground font-medium" : "text-muted-foreground",
            )}
          >
            <span className="tabular-nums">{index + 1}.</span> {step.label}
          </li>
        );
      })}
    </ol>
  );
}
