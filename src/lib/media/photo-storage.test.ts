import { describe, expect, it } from "vitest";
import {
  isPersistedStoragePath,
  ownerPhotoObjectPath,
  photoExtensionForMime,
} from "@/lib/media/photo-storage";
import {
  photoErrorMessage,
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
