import Image from "next/image";
import { isUsableImageSrc } from "@/lib/media/photo-url";
import { cn } from "@/lib/utils";

export function CoverPhoto({
  src,
  alt = "",
  className,
  sizes,
  priority = false,
  loading,
  fetchPriority,
  quality,
}: {
  src: string;
  alt?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  quality?: number;
}) {
  if (!isUsableImageSrc(src)) return null;

  const eager = Boolean(priority || loading === "eager");

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes ?? "100vw"}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={fetchPriority ?? (eager ? "high" : "auto")}
      quality={quality}
      decoding="async"
      className={cn("pointer-events-none object-cover", className)}
    />
  );
}
