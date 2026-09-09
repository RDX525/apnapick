import {
  Bug,
  Car,
  Coffee,
  Dumbbell,
  Fan,
  GraduationCap,
  Hammer,
  HeartPulse,
  PaintRoller,
  Pizza,
  Plug,
  Scissors,
  Search,
  Shirt,
  ShoppingBag,
  Sparkles,
  Store,
  UtensilsCrossed,
  WashingMachine,
  Wrench,
  type LucideIcon,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "food-dining": UtensilsCrossed,
  restaurants: UtensilsCrossed,
  cafes: Coffee,
  bakeries: Coffee,
  barbers: Scissors,
  plumbers: Wrench,
  plumber: Wrench,
  services: Wrench,
  "home-repair": Wrench,
  electrician: Plug,
  electricians: Plug,
  "ac-repair": Fan,
  carpenter: Hammer,
  carpenters: Hammer,
  cleaning: Sparkles,
  cleaners: Sparkles,
  painter: PaintRoller,
  painters: PaintRoller,
  "pest-control": Bug,
  appliance: WashingMachine,
  "appliance-repair": WashingMachine,
  "beauty-personal-care": Sparkles,
  "clothing-fashion": Shirt,
  "shopping-retail": ShoppingBag,
  "fitness-sports": Dumbbell,
  gyms: Dumbbell,
  "health-wellness": HeartPulse,
  dentists: HeartPulse,
  automotive: Car,
  "education-learning": GraduationCap,
};

export function CategoryIcon({ slug, className }: { slug: string; className?: string }) {
  const Icon = CATEGORY_ICONS[slug] ?? Store;
  return <Icon className={className} aria-hidden />;
}

function intentKind(
  query: string,
):
  | "pizza"
  | "coffee"
  | "barber"
  | "repair"
  | "electric"
  | "ac"
  | "clean"
  | "food"
  | "clothing"
  | "search" {
  const q = query.toLowerCase();
  if (q.includes("shirt") || q.includes("kurta") || q.includes("clothing")) {
    return "clothing";
  }
  if (q.includes("pizza")) return "pizza";
  if (
    q.includes("coffee") ||
    q.includes("café") ||
    q.includes("cafe") ||
    q.includes("chai")
  ) {
    return "coffee";
  }
  if (q.includes("barber") || q.includes("fade") || q.includes("hair")) {
    return "barber";
  }
  if (q.includes("ac") || q.includes("air condition")) return "ac";
  if (q.includes("electric") || q.includes("wiring")) return "electric";
  if (q.includes("clean") || q.includes("maid")) return "clean";
  if (
    q.includes("plumb") ||
    q.includes("tap") ||
    q.includes("leak") ||
    q.includes("drain") ||
    q.includes("carpenter") ||
    q.includes("paint") ||
    q.includes("pest") ||
    q.includes("appliance")
  ) {
    return "repair";
  }
  if (
    q.includes("restaurant") ||
    q.includes("curry") ||
    q.includes("biryani") ||
    q.includes("misal") ||
    q.includes("dosa") ||
    q.includes("food")
  ) {
    return "food";
  }
  return "search";
}

export function IntentIcon({ query, className }: { query: string; className?: string }) {
  switch (intentKind(query)) {
    case "pizza":
      return <Pizza className={className} aria-hidden />;
    case "coffee":
      return <Coffee className={className} aria-hidden />;
    case "barber":
      return <Scissors className={className} aria-hidden />;
    case "electric":
      return <Plug className={className} aria-hidden />;
    case "ac":
      return <Fan className={className} aria-hidden />;
    case "clean":
      return <Sparkles className={className} aria-hidden />;
    case "repair":
      return <Wrench className={className} aria-hidden />;
    case "food":
      return <UtensilsCrossed className={className} aria-hidden />;
    case "clothing":
      return <Shirt className={className} aria-hidden />;
    default:
      return <Search className={className} aria-hidden />;
  }
}
