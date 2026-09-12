export const BUSINESS_PHOTOS_BUCKET = "business-photos";

function trimPath(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isHttpOrRootRelative(value: string): boolean {
  if (value.startsWith("https://") || value.startsWith("http://")) return true;
  return value.startsWith("/") && !value.startsWith("//");
}

/** True when `src` is safe to pass to `next/image`. */
export function isUsableImageSrc(src: string | null | undefined): src is string {
  const value = trimPath(src);
  return value != null && isHttpOrRootRelative(value);
}

export function pickImageSrc(
  preferred: string | null | undefined,
  fallback: string,
): string {
  return isUsableImageSrc(preferred) ? preferred : fallback;
}

/**
 * Turns a photos.storage_path into a public image URL.
 * Onboarding placeholders like `local/<id>` are not real files and return null.
 */
export function resolvePhotoUrl(
  storagePath: string | null | undefined,
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
): string | null {
  const value = trimPath(storagePath);
  if (!value) return null;
  if (value.startsWith("local/") || value.startsWith("blob:")) return null;
  if (isHttpOrRootRelative(value)) return value;

  const origin = trimPath(supabaseUrl)?.replace(/\/$/, "");
  if (!origin) return null;

  const objectPath = value
    .replace(/^\/+/, "")
    .replace(new RegExp(`^${BUSINESS_PHOTOS_BUCKET}/`), "")
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  if (!objectPath) return null;

  return `${origin}/storage/v1/object/public/${BUSINESS_PHOTOS_BUCKET}/${objectPath}`;
}

export type CoverPhotoInput = {
  storagePath?: string | null;
  storage_path?: string | null;
  isCover?: boolean;
  is_cover?: boolean;
  deletedAt?: string | null;
  deleted_at?: string | null;
  sortOrder?: number;
  sort_order?: number;
};

/** Cover first, then gallery order. Skips deleted rows and unusable paths. */
export function pickCoverPhotoUrl(
  photos: CoverPhotoInput[],
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
): string | null {
  const live = photos.filter((photo) => !photo.deletedAt && !photo.deleted_at);
  live.sort((a, b) => {
    const coverA = Boolean(a.isCover || a.is_cover);
    const coverB = Boolean(b.isCover || b.is_cover);
    if (coverA !== coverB) return coverA ? -1 : 1;
    return (a.sortOrder ?? a.sort_order ?? 0) - (b.sortOrder ?? b.sort_order ?? 0);
  });
  for (const photo of live) {
    const url = resolvePhotoUrl(photo.storagePath ?? photo.storage_path, supabaseUrl);
    if (url) return url;
  }
  return null;
}
