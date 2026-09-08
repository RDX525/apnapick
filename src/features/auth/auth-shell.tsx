import type { ReactNode } from "react";
import Link from "next/link";
import {
  Check,
  LineChart,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UtensilsCrossed,
} from "lucide-react";
import { CoverPhoto } from "@/components/media/cover-photo";
import { MEDIA } from "@/config/visual-media";

const benefits = [
  {
    text: "Show up for exact dishes and services",
    icon: UtensilsCrossed,
  },
  {
    text: "Build trust with verified business details",
    icon: ShieldCheck,
  },
  {
    text: "Understand what local customers search for",
    icon: LineChart,
  },
];

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="relative mx-auto grid w-full max-w-7xl flex-1 items-stretch gap-5 px-4 py-6 sm:px-6 lg:grid-cols-2 lg:py-10">
      <section className="ap-brand-panel relative hidden min-h-[36rem] overflow-hidden rounded-[2rem] p-10 lg:flex lg:flex-col xl:p-12">
        <CoverPhoto
          src={MEDIA.loginAtmosphere}
          alt=""
          sizes="50vw"
          className="scale-105 object-[center_40%]"
        />
        <div
          className="ap-brand-scrim pointer-events-none absolute inset-0"
          aria-hidden
        />
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          <div>
            <Link href="/" className="font-display text-brand-on text-2xl">
              Apna<span className="text-brand-on/75">Pick</span>
            </Link>
            <p className="text-brand-on/70 mt-8 text-xs font-semibold tracking-[0.16em] uppercase">
              Built for Pune businesses
            </p>
            <h2 className="font-display text-brand-on mt-5 max-w-md text-5xl leading-[1.05] tracking-tight">
              Be found for what you do best.
            </h2>
            <p className="text-brand-on/75 mt-5 max-w-md text-base leading-relaxed">
              ApnaPick connects real customer intent with trusted local businesses.
            </p>
          </div>

          <div className="mt-10 space-y-3">
            {benefits.map((benefit) => (
              <div
                key={benefit.text}
                className="text-brand-on flex items-center gap-3 rounded-2xl bg-white/12 px-4 py-3 text-sm ring-1 ring-white/15 backdrop-blur-sm"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/15">
                  <benefit.icon className="size-3.5" aria-hidden />
                </span>
                {benefit.text}
              </div>
            ))}
          </div>

          <div className="mt-auto pt-10">
            <div className="bg-card/92 text-card-foreground ring-border rounded-[1.4rem] p-3 shadow-xl ring-1 backdrop-blur">
              <div className="bg-secondary/80 text-muted-foreground flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs">
                <Search className="text-sea size-3.5" aria-hidden />
                Best chicken curry open now
                <Check className="text-sea ml-auto size-3.5" aria-hidden />
              </div>
              <div className="mt-2 flex items-center gap-3 rounded-2xl p-1">
                <div className="relative size-11 shrink-0 overflow-hidden rounded-xl">
                  <CoverPhoto src={MEDIA.curry} alt="" sizes="44px" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">Exact local match</p>
                  <p className="text-muted-foreground mt-0.5 inline-flex items-center gap-1 text-[11px]">
                    <MapPin className="size-3" aria-hidden />
                    Pune businesses, live from the catalog
                  </p>
                </div>
                <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold">
                  <Star className="fill-accent text-accent size-3" aria-hidden />
                  Live
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative flex min-w-0 items-center justify-center overflow-hidden rounded-[2rem] py-5 sm:py-8 lg:py-10">
        <div
          className="pointer-events-none absolute top-[18%] right-[8%] size-56 rounded-full bg-[var(--ambient-cyan)] blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-[12%] left-[8%] size-48 rounded-full bg-[var(--ambient-indigo)] blur-3xl"
          aria-hidden
        />
        <div className="relative w-full max-w-lg">
          <Link
            href="/"
            className="font-display text-ink mb-8 inline-flex text-2xl lg:hidden"
          >
            Apna<span className="ap-brand-pick">Pick</span>
          </Link>
          <span className="bg-sea/10 text-sea inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold">
            <Sparkles className="size-3.5" aria-hidden />
            {eyebrow}
          </span>
          <h1 className="font-display text-ink mt-5 text-4xl leading-tight tracking-tight sm:text-5xl">
            {title}
          </h1>
          <p className="text-muted-foreground mt-3 text-base leading-relaxed">
            {description}
          </p>
          {children}
        </div>
      </section>
    </main>
  );
}
