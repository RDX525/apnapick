import { LocateFixed, Search, ShieldCheck, Sparkles } from "lucide-react";
import { CoverPhoto } from "@/components/media/cover-photo";
import { MEDIA } from "@/config/visual-media";

const HERO_TICKER = [
  "Pav bhaji under ₹200",
  "Chicken curry under ₹300",
  "Haircut open now",
  "Plumber nearby",
  "Black shirt under ₹1500",
  "WhatsApp, call, or go",
] as const;

export function HeroStage() {
  return (
    <div className="relative isolate mx-auto w-full min-w-0 max-w-lg lg:max-w-none">
      <MobileEditorialCard />
      <DesktopDiscoveryMock />
    </div>
  );
}

function HeroTickerLine() {
  return (
    <div className="flex items-center gap-3 pr-3">
      {HERO_TICKER.map((line) => (
        <span
          key={line}
          className="text-muted-foreground flex shrink-0 items-center gap-3 text-[11px] font-medium whitespace-nowrap"
        >
          <span className="bg-sea size-1.5 rounded-full" aria-hidden />
          {line}
        </span>
      ))}
    </div>
  );
}

function MobileEditorialCard() {
  return (
    <div className="relative w-full min-w-0 lg:hidden">
      <div
        className="from-sea/25 to-primary/10 pointer-events-none absolute -inset-2 -z-10 rounded-[1.85rem] bg-gradient-to-br via-transparent blur-xl"
        aria-hidden
      />
      <div className="ap-glass border-border/70 relative w-full min-w-0 overflow-hidden rounded-[1.5rem] border p-1.5 shadow-[0_24px_60px_-36px_rgb(15_23_42/0.45)]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[1.1rem]">
          <CoverPhoto
            src={MEDIA.pavBhaji}
            alt=""
            sizes="(max-width: 1024px) 100vw, 32rem"
            priority
            quality={85}
            className="object-[center_58%]"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(6_16_28/20%)_0%,rgb(6_16_28/4%)_42%,rgb(6_16_28/70%)_100%)]"
            aria-hidden
          />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/14 px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-white uppercase ring-1 ring-white/22 backdrop-blur-md">
              <Sparkles className="size-3" aria-hidden />
              Intent match
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/14 px-2.5 py-1 text-[11px] font-medium text-white ring-1 ring-white/22 backdrop-blur-md">
              <LocateFixed className="size-3.5" aria-hidden />
              Pune
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-3">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-white/70 uppercase">
              Tonight · Under ₹200
            </p>
            <p className="font-display mt-0.5 text-[1.55rem] leading-none tracking-tight text-white">
              Pav bhaji
            </p>
          </div>
        </div>
        <div className="relative flex min-w-0 items-center gap-2 overflow-hidden px-1.5 py-2">
          <ShieldCheck className="text-sea size-3.5 shrink-0" aria-hidden />
          <div className="ap-marquee ap-hero-ticker min-w-0 flex-1">
            <div className="ap-marquee-track">
              <HeroTickerLine />
              <div aria-hidden>
                <HeroTickerLine />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DesktopDiscoveryMock() {
  return (
    <div className="relative hidden lg:block">
      <div aria-hidden className="ap-hero-glow" />
      <div
        className="from-sea/20 to-primary/10 pointer-events-none absolute -inset-2 -z-10 rounded-[2.75rem] bg-gradient-to-br via-transparent blur-xl"
        aria-hidden
      />
      <div className="ap-glass border-border/70 relative overflow-hidden rounded-[2.25rem] border p-3.5 shadow-[0_40px_100px_-52px_var(--surface-shadow)]">
        <div className="ap-map-canvas ap-map-premium border-border/80 relative min-h-[32rem] overflow-hidden rounded-[1.65rem] border p-5">
          <div className="ap-map-wash pointer-events-none absolute inset-0" aria-hidden />
          <div
            className="ap-map-grid pointer-events-none absolute inset-0 opacity-20"
            aria-hidden
          />
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full opacity-60"
            viewBox="0 0 480 520"
            aria-hidden
          >
            <path
              d="M-20 95C70 55 135 155 225 138C320 120 352 28 510 82"
              fill="none"
              stroke="currentColor"
              strokeWidth="11"
              className="text-foreground/8"
            />
            <path
              d="M-5 480C115 414 92 290 212 262C330 234 354 370 510 312"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-sea/20"
            />
            <path
              d="M60 10C105 120 34 198 118 278C180 336 156 438 110 530"
              fill="none"
              stroke="currentColor"
              strokeWidth="5"
              strokeDasharray="4 12"
              className="text-foreground/10"
            />
            <circle cx="260" cy="205" r="104" className="fill-sea/8" />
            <circle cx="260" cy="205" r="44" className="fill-primary/8" />
          </svg>

          <div className="relative flex items-center justify-between">
            <span className="bg-card/85 text-foreground ring-border inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm ring-1 backdrop-blur-md">
              <Sparkles className="text-sea size-3.5" aria-hidden />
              Discovery preview
            </span>
            <span className="bg-card/85 text-sea ring-border inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium shadow-sm ring-1 backdrop-blur-md">
              <LocateFixed className="size-3.5" aria-hidden />
              Pune
            </span>
          </div>

          <div className="bg-card/90 ring-border relative mt-5 rounded-2xl p-2 shadow-[0_14px_35px_-24px_var(--surface-shadow)] ring-1 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="bg-sea/10 text-sea grid size-9 shrink-0 place-items-center rounded-xl">
                <Search className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.12em] uppercase">
                  Example search
                </p>
                <p className="text-foreground mt-0.5 truncate text-sm font-medium">
                  Chicken curry under ₹300 near me
                </p>
              </div>
              <span className="bg-sea text-primary-foreground grid size-8 shrink-0 place-items-center rounded-xl shadow-sm">
                <Sparkles className="size-3.5" aria-hidden />
              </span>
            </div>
          </div>

          <div className="bg-card/95 ring-border relative mt-4 ml-auto w-[94%] overflow-hidden rounded-[1.6rem] shadow-[0_30px_70px_-38px_rgb(15_23_42/0.5)] ring-1 backdrop-blur-md">
            <div className="group relative h-36 overflow-hidden">
              <CoverPhoto
                src={MEDIA.curry}
                alt=""
                sizes="28rem"
                quality={85}
                priority
                className="transition duration-700 group-hover:scale-105"
              />
              <div
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgb(0_0_0/58%),transparent_58%)]"
                aria-hidden
              />
              <div className="absolute top-3 left-3">
                <span className="text-sea inline-flex items-center gap-1.5 rounded-full bg-white/92 px-2.5 py-1.5 text-[10px] font-bold tracking-[0.08em] uppercase shadow-sm backdrop-blur">
                  <Sparkles className="size-3" aria-hidden />
                  Intent match
                </span>
              </div>
            </div>

            <div className="p-5">
              <p className="font-display text-ink text-xl leading-tight">
                Chicken curry under ₹300
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Search the dish, budget, and area — listings show only when they match.
              </p>

              <div className="bg-sea/8 border-sea/10 mt-4 flex items-center gap-3 rounded-2xl border px-3 py-2.5">
                <span className="bg-sea text-primary-foreground grid size-8 shrink-0 place-items-center rounded-xl">
                  <ShieldCheck className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-foreground text-xs font-semibold">
                    WhatsApp, call, or go
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-[10px]">
                    Results stay empty until a real published listing matches the query.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div
            className="absolute top-[44%] left-[4%] flex items-center gap-1.5"
            aria-hidden
          >
            <span className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-full text-[11px] font-semibold shadow-lg ring-2 ring-white/85">
              2
            </span>
          </div>
          <div
            className="bg-sea/90 absolute bottom-[9%] left-[9%] size-2.5 rounded-full ring-4 ring-white/70"
            aria-hidden
          />
          <div
            className="bg-primary/80 absolute top-[33%] right-[8%] size-2 rounded-full ring-4 ring-white/60"
            aria-hidden
          />
        </div>
        <div className="text-muted-foreground relative flex items-start gap-2 px-2 pt-3 text-xs leading-relaxed">
          <ShieldCheck className="text-sea size-4" aria-hidden />
          Organic matches stay independent from clearly labeled sponsored results.
        </div>
      </div>
    </div>
  );
}
