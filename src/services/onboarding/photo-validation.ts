/** Photo upload validation — shared client + server. */

export const PHOTO_LIMITS = {
  maxBytes: 5 * 1024 * 1024, // 5 MB
  maxGallery: 20,
  allowedMime: ["image/jpeg", "image/png", "image/webp", "image/gif"] as const,
} as const;

export type PhotoValidationError = "too_large" | "invalid_type" | "empty" | "too_many";

export type AllowedPhotoMime = (typeof PHOTO_LIMITS.allowedMime)[number];

function byteAt(bytes: Uint8Array, index: number) {
  return bytes[index] ?? 0;
}

/** Magic-byte sniff. Never trust `file.type` for persistence. */
export function sniffImageMime(bytes: Uint8Array): AllowedPhotoMime | null {
  if (bytes.length < 12) return null;
  if (byteAt(bytes, 0) === 0xff && byteAt(bytes, 1) === 0xd8 && byteAt(bytes, 2) === 0xff) {
    return "image/jpeg";
  }
  if (
    byteAt(bytes, 0) === 0x89 &&
    byteAt(bytes, 1) === 0x50 &&
    byteAt(bytes, 2) === 0x4e &&
    byteAt(bytes, 3) === 0x47
  ) {
    return "image/png";
  }
  if (
    byteAt(bytes, 0) === 0x47 &&
    byteAt(bytes, 1) === 0x49 &&
    byteAt(bytes, 2) === 0x46 &&
    byteAt(bytes, 3) === 0x38
  ) {
    return "image/gif";
  }
  const riff = String.fromCharCode(
    byteAt(bytes, 0),
    byteAt(bytes, 1),
    byteAt(bytes, 2),
    byteAt(bytes, 3),
  );
  const webp = String.fromCharCode(
    byteAt(bytes, 8),
    byteAt(bytes, 9),
    byteAt(bytes, 10),
    byteAt(bytes, 11),
  );
  if (riff === "RIFF" && webp === "WEBP") return "image/webp";
  return null;
}

export function validatePhotoFile(
  file: { size: number; type: string },
  options?: { galleryCount?: number; maxGallery?: number },
): PhotoValidationError | null {
  if (!file || file.size <= 0) return "empty";
  if (file.size > PHOTO_LIMITS.maxBytes) return "too_large";
  if (!(PHOTO_LIMITS.allowedMime as readonly string[]).includes(file.type)) {
    return "invalid_type";
  }
  const maxGallery = options?.maxGallery ?? PHOTO_LIMITS.maxGallery;
  if (options?.galleryCount != null && options.galleryCount >= maxGallery) {
    return "too_many";
  }
  return null;
}

export function validatePhotoBytes(
  bytes: Uint8Array,
  options?: { galleryCount?: number; maxGallery?: number },
): { error: PhotoValidationError } | { mime: AllowedPhotoMime } {
  if (!bytes || bytes.length <= 0) return { error: "empty" };
  if (bytes.length > PHOTO_LIMITS.maxBytes) return { error: "too_large" };
  const mime = sniffImageMime(bytes);
  if (!mime) return { error: "invalid_type" };
  const maxGallery = options?.maxGallery ?? PHOTO_LIMITS.maxGallery;
  if (options?.galleryCount != null && options.galleryCount >= maxGallery) {
    return { error: "too_many" };
  }
  return { mime };
}

export function photoErrorMessage(
  code: PhotoValidationError,
  maxGallery: number = PHOTO_LIMITS.maxGallery,
): string {
  switch (code) {
    case "too_large":
      return "Image must be 5 MB or smaller.";
    case "invalid_type":
      return "Use JPEG, PNG, WebP, or GIF.";
    case "empty":
      return "Choose a valid image file.";
    case "too_many":
      return `Gallery limit is ${maxGallery} photos.`;
  }
}

/** Approximate optimization hint — real resize happens via storage pipeline later. */
export function shouldOptimize(sizeBytes: number): boolean {
  return sizeBytes > 800 * 1024;
}
