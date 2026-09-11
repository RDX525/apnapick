import type { ReactNode } from "react";
import Link from "next/link";
import { MapPin, Sparkles } from "lucide-react";
import { CoverPhoto } from "@/components/media/cover-photo";
import { MEDIA } from "@/config/visual-media";
import { OwnerJourneySteps } from "@/features/auth/owner-journey-steps";

export function AuthShell({
  eyebrow,
  title,
  description,
  journeyStep,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  journeyStep?: "account" | "list" | "dashboard";
  children: ReactNode;
}) {
  return (
    <main className="relative mx-auto grid w-full max-w-7xl flex-1 items-stretch gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:gap-8 lg:py-8">
      <section className="relative hidden overflow-hidden rounded-[2.25rem] p-3 shadow-[0_48px_120px_-56px_rgb(8_16_28/0.72)] ring-1 ring-white/25 lg:flex lg:h-[calc(100dvh-4rem)] lg:max-h-[54rem] lg:min-h-[38rem] lg:flex-col">
        <div className="ap-brand-panel relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.75rem]">
          <CoverPhoto
            src={MEDIA.puneCity}
            alt=""
            sizes="(min-width: 1024px) 48vw, 100vw"
            quality={82}
            className="scale-[1.08] object-[center_42%]"
          />
          <div
            className="ap-brand-scrim pointer-events-none absolute inset-0"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_55%_at_88%_-8%,rgb(255_255_255/0.22),transparent_52%)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 rounded-[1.75rem] ring-1 ring-white/18 ring-inset"
            aria-hidden
          />

          <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-between gap-8 p-10 xl:p-12">
            <div>
              <Link
                href="/"
                className="font-display text-brand-on text-[1.65rem] tracking-tight"
              >
                Apna<span className="text-white/72">Pick</span>
              </Link>
              <span
                className="mt-5 block h-px w-12 bg-gradient-to-r from-white/70 to-transparent"
                aria-hidden
              />

              <p className="text-brand-on/72 mt-10 inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] uppercase">
                <MapPin className="size-3.5" aria-hidden />
                Kharadi · Wagholi · Lohegaon
              </p>
              <h2 className="font-display text-brand-on mt-4 max-w-[18ch] text-[2.85rem] leading-[1.06] tracking-tight xl:text-5xl">
                Be found for the dish, the job, the budget.
              </h2>
              <p className="text-brand-on/78 mt-5 max-w-md text-[15px] leading-relaxed">
                Customers search what they want. Your listing appears when you actually
                offer it — in the neighbourhoods ApnaPick is live.
              </p>
            </div>

            <div className="bg-card/96 text-card-foreground shrink-0 overflow-hidden rounded-[1.55rem] shadow-[0_28px_64px_-24px_rgb(8_16_28/0.58)] ring-1 ring-white/55">
              <div className="group relative h-36 overflow-hidden">
                <CoverPhoto
                  src={MEDIA.pavBhaji}
                  alt=""
                  sizes="(min-width: 1024px) 28rem, 100vw"
                  quality={78}
                  className="object-cover transition duration-700 group-hover:scale-105"
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgb(8_16_28/0.55),transparent_58%)]"
                  aria-hidden
                />
                <span className="text-sea absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/94 px-2.5 py-1.5 text-[10px] font-bold tracking-[0.08em] uppercase shadow-sm backdrop-blur">
                  <Sparkles className="size-3" aria-hidden />
                  Intent match
                </span>
              </div>
              <div className="px-4 py-3.5">
                <p className="font-display text-ink text-lg leading-tight">
                  Pav Bhaji under ₹150
                </p>
                <p className="text-muted-foreground mt-1 inline-flex items-center gap-1.5 text-xs">
                  <MapPin className="size-3.5" aria-hidden />
                  Wagholi · shown only when the listing fits
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative flex min-w-0 items-center justify-center overflow-hidden rounded-[2rem] py-4 sm:py-8 lg:py-6">
        <div
          className="pointer-events-none absolute top-[14%] right-[6%] size-56 rounded-full bg-[var(--ambient-cyan)] blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-[10%] left-[8%] size-48 rounded-full bg-[var(--ambient-indigo)] blur-3xl"
          aria-hidden
        />
        <div className="relative w-full max-w-lg">
          <Link
            href="/"
            className="font-display text-ink mb-8 inline-flex text-2xl tracking-tight lg:hidden"
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
          {journeyStep ? <OwnerJourneySteps current={journeyStep} /> : null}
          {children}
        </div>
      </section>
    </main>
  );
}
