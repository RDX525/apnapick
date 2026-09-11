/** Photo upload validation — shared client + server. */

export const PHOTO_LIMITS = {
  maxBytes: 5 * 1024 * 1024, // 5 MB
  maxGallery: 20,
  allowedMime: ["image/jpeg", "image/png", "image/webp", "image/gif"] as const,
} as const;

export type PhotoValidationError = "too_large" | "invalid_type" | "empty" | "too_many";

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
