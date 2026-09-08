import Link from "next/link";
import { BusinessResultCard } from "@/components/search/business-result-card";
import { BackLink } from "@/components/navigation/back-link";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { EmptyState } from "@/components/states/empty-state";
import type { SeoHubPage } from "@/domain/seo/types";
import { hubStructuredData, jsonLdScript } from "@/lib/seo/json-ld";

export function SeoHubView({ hub }: { hub: SeoHubPage }) {
  const structured = hubStructuredData(hub);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(structured)}
      />

      <section className="ap-media-gradient border-border relative overflow-hidden rounded-[2rem] border px-5 py-8 sm:px-9 sm:py-10">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <BackLink href={hub.breadcrumbs.at(-2)?.path ?? "/"} />
          <Breadcrumbs items={hub.breadcrumbs} />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-end">
          <div>
            <p className="ap-kicker">Local discovery guide</p>
            <h1 className="font-display text-ink mt-4 max-w-3xl text-4xl leading-tight tracking-tight sm:text-5xl">
              {hub.h1}
            </h1>
            <p className="text-muted-foreground mt-4 max-w-2xl text-base leading-relaxed">
              {hub.intro}
            </p>
          </div>

          {hub.relatedLinks.length > 0 ? (
            <div className="flex flex-wrap gap-2 lg:justify-end">
              {hub.relatedLinks.map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  className="bg-card/75 text-secondary-foreground ring-border hover:bg-card hover:text-foreground inline-flex min-h-11 items-center rounded-full px-4 text-sm ring-1 backdrop-blur transition"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {hub.catalogItems.length > 0 ? (
        <section className="mt-10" aria-labelledby="hub-items">
          <h2 id="hub-items" className="font-display text-ink text-2xl">
            Popular items & services
          </h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {hub.catalogItems.map((item) => (
              <li key={`${item.kind}-${item.slug}-${item.path}`}>
                <Link
                  href={item.path}
                  className="ap-surface-interactive block rounded-2xl px-5 py-4 text-sm"
                >
                  <span className="font-medium">{item.name}</span>
                  <span className="text-muted-foreground mt-0.5 block text-xs capitalize">
                    {item.kind}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-10" aria-labelledby="hub-listings">
        <h2 id="hub-listings" className="font-display text-ink text-2xl">
          Local businesses
        </h2>
        <div className="mt-6 space-y-4">
          {hub.businesses.length === 0 ? (
            <EmptyState
              title="No matching listings here yet"
              description="Try a broader nearby search while local businesses add more details."
              actionLabel="Search instead"
              actionHref={`/search?q=${encodeURIComponent(
                [hub.itemName, hub.facetName, hub.categoryName, hub.areaName ?? "Pune"]
                  .filter(Boolean)
                  .join(" "),
              )}`}
            />
          ) : (
            hub.businesses.map((b) => <BusinessResultCard key={b.id} business={b} />)
          )}
        </div>
      </section>
    </main>
  );
}
