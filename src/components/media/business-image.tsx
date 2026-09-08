"use client";

import Image, { type ImageLoaderProps, type ImageProps } from "next/image";

function isSupabaseStorageSrc(src: string) {
  try {
    const pathname = new URL(src).pathname;
    return (
      pathname.includes("/storage/v1/object/public/") ||
      pathname.includes("/storage/v1/render/image/public/")
    );
  } catch {
    return false;
  }
}

function businessImageLoader({ src, width, quality }: ImageLoaderProps) {
  const url = new URL(src);
  if (url.pathname.includes("/storage/v1/object/public/")) {
    url.pathname = url.pathname.replace(
      "/storage/v1/object/public/",
      "/storage/v1/render/image/public/",
    );
  }
  url.searchParams.set("width", String(width));
  url.searchParams.set("quality", String(quality ?? 75));
  url.searchParams.set("resize", "cover");
  return url.toString();
}

type BusinessImageProps = Omit<ImageProps, "loader">;

export function BusinessImage({
  alt,
  preload,
  priority,
  loading,
  fetchPriority,
  src,
  ...props
}: BusinessImageProps) {
  const eager = Boolean(preload || priority || loading === "eager");
  const supabaseSrc = typeof src === "string" && isSupabaseStorageSrc(src);
  return (
    <Image
      {...props}
      src={src}
      loader={supabaseSrc ? businessImageLoader : undefined}
      alt={alt}
      loading={eager ? "eager" : (loading ?? "lazy")}
      fetchPriority={eager ? "high" : fetchPriority}
    />
  );
}
