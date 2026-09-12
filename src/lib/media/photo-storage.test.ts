import { describe, expect, it } from "vitest";
import {
  isPersistedStoragePath,
  ownerPhotoObjectPath,
  photoExtensionForMime,
  photoStorageObjectKey,
} from "@/lib/media/photo-storage";
import {
  photoErrorMessage,
  sniffImageMime,
  validatePhotoBytes,
  validatePhotoFile,
} from "@/services/onboarding/photo-validation";

describe("photo storage helpers", () => {
  it("builds a business-scoped object key", () => {
    expect(
      ownerPhotoObjectPath(
        "11111111-1111-1111-1111-111111111101",
        "22222222-2222-2222-2222-222222222201",
        "image/jpeg",
      ),
    ).toBe(
      "11111111-1111-1111-1111-111111111101/22222222-2222-2222-2222-222222222201.jpg",
    );
    expect(photoExtensionForMime("image/webp")).toBe("webp");
    expect(photoExtensionForMime("application/pdf")).toBeNull();
  });

  it("extracts the storage object key from paths and public URLs", () => {
    expect(
      photoStorageObjectKey(
        "b14d373d-9292-45c8-b681-24494529fcae/d1c30a79-7333-4a54-87e6-ba032f580f78.png",
      ),
    ).toBe(
      "b14d373d-9292-45c8-b681-24494529fcae/d1c30a79-7333-4a54-87e6-ba032f580f78.png",
    );
    expect(
      photoStorageObjectKey(
        "business-photos/b14d373d-9292-45c8-b681-24494529fcae/cover.jpg",
      ),
    ).toBe("b14d373d-9292-45c8-b681-24494529fcae/cover.jpg");
    expect(
      photoStorageObjectKey(
        "https://example.supabase.co/storage/v1/object/public/business-photos/biz/cover.jpg?v=1",
      ),
    ).toBe("biz/cover.jpg");
    expect(photoStorageObjectKey("local/abc")).toBeNull();
  });

  it("rejects local placeholders and blob urls", () => {
    expect(isPersistedStoragePath("blob:http://localhost/1")).toBe(false);
    expect(isPersistedStoragePath("local/abc")).toBe(false);
    expect(isPersistedStoragePath("biz/cover.jpg")).toBe(true);
  });
});

describe("photo validation plan limits", () => {
  it("uses the caller’s gallery cap", () => {
    const file = { size: 1024, type: "image/jpeg" };
    expect(validatePhotoFile(file, { galleryCount: 5, maxGallery: 5 })).toBe("too_many");
    expect(photoErrorMessage("too_many", 5)).toBe("Gallery limit is 5 photos.");
  });
});

describe("photo magic-byte sniff", () => {
  it("accepts JPEG/PNG/GIF/WebP headers and rejects spoofed types", () => {
    const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, ...Array(12).fill(0)]);
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, ...Array(12).fill(0)]);
    const gif = Uint8Array.from([0x47, 0x49, 0x46, 0x38, ...Array(12).fill(0)]);
    const webp = new Uint8Array(16);
    webp.set([0x52, 0x49, 0x46, 0x46], 0);
    webp.set([0x57, 0x45, 0x42, 0x50], 8);
    const pdf = Uint8Array.from([0x25, 0x50, 0x44, 0x46, ...Array(12).fill(0)]);

    expect(sniffImageMime(jpeg)).toBe("image/jpeg");
    expect(sniffImageMime(png)).toBe("image/png");
    expect(sniffImageMime(gif)).toBe("image/gif");
    expect(sniffImageMime(webp)).toBe("image/webp");
    expect(sniffImageMime(pdf)).toBeNull();
    expect("mime" in validatePhotoBytes(jpeg)).toBe(true);
    expect(validatePhotoBytes(pdf)).toEqual({ error: "invalid_type" });
  });
});
