import { describe, expect, it } from "vitest";
import { safeAuthNextPath } from "@/lib/security/safe-redirect";
import { escapeJsonForScript } from "@/lib/security/sanitize";
import { escapePostgrestOrValue } from "@/lib/security/sanitize";

describe("safeAuthNextPath", () => {
  it("allows relative app paths", () => {
    expect(safeAuthNextPath("/business/dashboard")).toBe("/business/dashboard");
    expect(safeAuthNextPath("/admin/claims")).toBe("/admin/claims");
    expect(safeAuthNextPath("/restaurants/pune")).toBe("/restaurants/pune");
  });

  it("rejects open redirects", () => {
    expect(safeAuthNextPath("https://evil.com")).toBe("/business/onboarding");
    expect(safeAuthNextPath("//evil.com")).toBe("/business/onboarding");
    expect(safeAuthNextPath("/\\evil.com")).toBe("/business/onboarding");
    expect(safeAuthNextPath("https://evil.com/path")).toBe("/business/onboarding");
  });
});

describe("sanitize helpers", () => {
  it("escapes JSON for script embedding", () => {
    const html = escapeJsonForScript({ name: "</script><script>alert(1)" });
    expect(html).not.toContain("</script>");
    expect(html).toContain("\\u003c");
  });

  it("escapes PostgREST or() filter values", () => {
    expect(escapePostgrestOrValue("a,b")).toBe("a\\,b");
    expect(escapePostgrestOrValue("100%")).toContain("%");
  });
});
