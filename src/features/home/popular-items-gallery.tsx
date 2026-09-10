import { ArrowUpRight } from "lucide-react";
import { CoverPhoto } from "@/components/media/cover-photo";
import { ScrollLink } from "@/components/navigation/scroll-link";
import { itemCover } from "@/config/visual-media";
import { cn } from "@/lib/utils";

type PopularItem = {
  name: string;
  href: string;
  kind?: string;
  blurb?: string;
};

function ItemCard({
  item,
  index,
  featured = false,
}: {
  item: PopularItem;
  index: number;
  featured?: boolean;
}) {
  const rank = String(index + 1).padStart(2, "0");

  return (
    <ScrollLink
      href={item.href}
      className={cn(
        "group relative flex min-h-[11.5rem] flex-col overflow-hidden rounded-[1.45rem] ring-1 ring-black/5 sm:min-h-[15.5rem] sm:rounded-[1.75rem]",
        featured ? "min-h-[18.5rem] sm:min-h-[21rem] lg:min-h-full" : "lg:min-h-[15.5rem]",
      )}
    >
      <CoverPhoto
        src={itemCover(item.name)}
        alt=""
        sizes={
          featured
            ? "(max-width: 1024px) 100vw, 58vw"
            : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        }
        quality={75}
        className="transition duration-700 ease-out group-hover:scale-105"
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          featured
            ? "bg-[linear-gradient(180deg,rgb(6_16_28/18%)_0%,rgb(6_16_28/12%)_38%,rgb(6_16_28/78%)_100%)]"
            : "bg-[linear-gradient(180deg,rgb(6_16_28/8%)_0%,rgb(6_16_28/20%)_45%,rgb(6_16_28/78%)_100%)]",
        )}
        aria-hidden
      />

      <div className="relative z-10 flex h-full flex-col p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-white/14 px-2.5 py-1 text-[10px] font-medium tracking-[0.14em] text-white/90 uppercase ring-1 ring-white/20 backdrop-blur-md sm:px-3 sm:text-[11px]">
            {item.kind ?? "Popular"}
          </span>
          <span className="font-display text-sm text-white/55">{rank}</span>
        </div>

        <div className={cn("mt-auto", featured && "max-w-md")}>
          <h3
            className={cn(
              "font-display tracking-tight text-white",
              featured ? "text-[1.85rem] sm:text-5xl" : "text-xl sm:text-2xl",
            )}
          >
            {item.name}
          </h3>
          {item.blurb ? (
            <p
              className={cn(
                "mt-1.5 leading-relaxed text-white/75 sm:mt-2",
                featured ? "text-sm sm:text-base" : "hidden text-xs sm:block",
              )}
            >
              {item.blurb}
            </p>
          ) : null}
          <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-white sm:mt-4">
            Explore
            <ArrowUpRight
              className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              aria-hidden
            />
          </span>
        </div>
      </div>
    </ScrollLink>
  );
}

export function PopularItemsGallery({ items }: { items: PopularItem[] }) {
  const [featured, ...rest] = items;
  if (!featured) return null;

  const side = rest.slice(0, 2);
  const row = rest.slice(2);

  return (
    <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-4 lg:grid-cols-12 lg:grid-rows-[minmax(16rem,1fr)_minmax(16rem,auto)]">
      <div className="col-span-2 lg:col-span-7 lg:row-span-2">
        <ItemCard item={featured} index={0} featured />
      </div>
      {side.map((item, i) => (
        <div key={item.href} className="lg:col-span-5">
          <ItemCard item={item} index={i + 1} />
        </div>
      ))}
      {row.length > 0 ? (
        <div
          className={cn(
            "col-span-2 grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-12",
            row.length === 4 ? "lg:grid-cols-4" : "sm:grid-cols-3",
          )}
        >
          {row.map((item, i) => (
            <ItemCard key={item.href} item={item} index={i + 1 + side.length} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
