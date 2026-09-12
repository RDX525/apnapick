import { BUSINESS_PHOTOS_BUCKET } from "@/lib/media/photo-url";
import { PHOTO_LIMITS } from "@/services/onboarding/photo-validation";

const MIME_EXTENSION: Record<(typeof PHOTO_LIMITS.allowedMime)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function photoExtensionForMime(mime: string): string | null {
  if ((PHOTO_LIMITS.allowedMime as readonly string[]).includes(mime)) {
    return MIME_EXTENSION[mime as (typeof PHOTO_LIMITS.allowedMime)[number]];
  }
  return null;
}

/** True when a path can be stored on photos.storage_path. */
export function isPersistedStoragePath(
  value: string | null | undefined,
): value is string {
  const path = value?.trim() ?? "";
  if (!path) return false;
  return (
    !path.startsWith("blob:") &&
    !path.startsWith("data:") &&
    !path.startsWith("local/")
  );
}

/** Object key `{businessId}/{photoId}.ext` inside the business-photos bucket. */
export function ownerPhotoObjectPath(
  businessId: string,
  photoId: string,
  mime: string,
): string {
  const ext = photoExtensionForMime(mime) ?? "jpg";
  return `${businessId}/${photoId}.${ext}`;
}

/** Bucket object key for storage.remove(), from a photos.storage_path or public URL. */
export function photoStorageObjectKey(
  storagePath: string | null | undefined,
): string | null {
  const value = storagePath?.trim() ?? "";
  if (!isPersistedStoragePath(value)) return null;

  const publicMarker = `/object/public/${BUSINESS_PHOTOS_BUCKET}/`;
  const publicAt = value.indexOf(publicMarker);
  if (publicAt >= 0) {
    const key = decodeURIComponent(
      value.slice(publicAt + publicMarker.length).split("?")[0] ?? "",
    ).replace(/^\/+/, "");
    return key.length > 0 ? key : null;
  }

  const key = value
    .replace(/^\/+/, "")
    .replace(new RegExp(`^${BUSINESS_PHOTOS_BUCKET}/`), "");
  return key.length > 0 ? key : null;
}

export { BUSINESS_PHOTOS_BUCKET };
