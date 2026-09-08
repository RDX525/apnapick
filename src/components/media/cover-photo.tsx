import Image from "next/image";
import { cn } from "@/lib/utils";

export function CoverPhoto({
  src,
  alt = "",
  className,
  sizes,
  priority = false,
  quality,
}: {
  src: string;
  alt?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  quality?: number;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes ?? "100vw"}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      quality={quality}
      className={cn("pointer-events-none object-cover", className)}
    />
  );
}
