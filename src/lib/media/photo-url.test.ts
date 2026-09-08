import { describe, expect, it } from "vitest";
import { isUsableImageSrc, pickImageSrc, resolvePhotoUrl } from "@/lib/media/photo-url";

describe("isUsableImageSrc", () => {
  it("accepts absolute http(s) urls and root-relative paths", () => {
    expect(isUsableImageSrc("https://images.unsplash.com/photo.jpg")).toBe(true);
    expect(isUsableImageSrc("http://127.0.0.1:54321/storage/v1/object/public/x.jpg")).toBe(
      true,
    );
    expect(isUsableImageSrc("/images/Pav%20Bhaji.jpeg")).toBe(true);
  });

  it("rejects placeholders and protocol-relative urls", () => {
    expect(isUsableImageSrc("local/22e6a011-0c57-4570-99a1-d63b23e0f65d")).toBe(false);
    expect(isUsableImageSrc("blob:http://localhost:3000/abc")).toBe(false);
    expect(isUsableImageSrc("//cdn.example.com/x.jpg")).toBe(false);
    expect(isUsableImageSrc("")).toBe(false);
    expect(isUsableImageSrc(null)).toBe(false);
  });
});

describe("pickImageSrc", () => {
  it("falls back when the preferred src cannot be rendered", () => {
    expect(pickImageSrc("local/abc", "/images/fallback.jpg")).toBe("/images/fallback.jpg");
    expect(pickImageSrc("/images/cover.jpg", "/images/fallback.jpg")).toBe(
      "/images/cover.jpg",
    );
  });
});

describe("resolvePhotoUrl", () => {
  const supabaseUrl = "https://example.supabase.co";

  it("returns null for onboarding placeholder paths", () => {
    expect(resolvePhotoUrl("local/22e6a011-0c57-4570-99a1-d63b23e0f65d", supabaseUrl)).toBe(
      null,
    );
  });

  it("passes through already-usable urls", () => {
    expect(resolvePhotoUrl("https://images.pexels.com/photo.jpg", supabaseUrl)).toBe(
      "https://images.pexels.com/photo.jpg",
    );
    expect(resolvePhotoUrl("/images/ShaniwarWada.jpg", supabaseUrl)).toBe(
      "/images/ShaniwarWada.jpg",
    );
  });

  it("builds a public storage url for object keys", () => {
    expect(resolvePhotoUrl("biz-id/cover.jpg", supabaseUrl)).toBe(
      "https://example.supabase.co/storage/v1/object/public/business-photos/biz-id/cover.jpg",
    );
    expect(resolvePhotoUrl("business-photos/biz-id/cover.jpg", supabaseUrl)).toBe(
      "https://example.supabase.co/storage/v1/object/public/business-photos/biz-id/cover.jpg",
    );
  });

  it("returns null when there is no supabase origin for a storage key", () => {
    expect(resolvePhotoUrl("biz-id/cover.jpg", "")).toBe(null);
  });
});
