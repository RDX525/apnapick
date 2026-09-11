import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors/app-error";
import { requireWritableDatabase } from "@/lib/db/require-writable-db";
import { publicMutationMessage } from "@/lib/errors/public-message";
import { searchRetrieveLimit } from "@/lib/search/retrieve-window";
import { jsonError } from "@/lib/api/response";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("requireWritableDatabase", () => {
  it("returns the client when present", () => {
    const client = { ok: true };
    expect(requireWritableDatabase(client, "Save")).toBe(client);
  });

  it("fails closed when the client is missing", () => {
    expect(() => requireWritableDatabase(null, "Save")).toThrow(AppError);
    try {
      requireWritableDatabase(null, "Save");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).status).toBe(503);
      expect((error as AppError).code).toBe("DATABASE_UNAVAILABLE");
    }
  });
});

describe("publicMutationMessage", () => {
  it("never returns raw postgres text", () => {
    expect(publicMutationMessage("duplicate key value violates unique constraint", "Couldn’t save.")).toBe(
      "Couldn’t save.",
    );
    expect(
      publicMutationMessage("row-level security policy", "Couldn’t save."),
    ).toBe("Your session doesn’t have permission to submit this claim. Log in again and retry.");
  });
});

describe("searchRetrieveLimit", () => {
  it("keeps a floor of 80 and grows with page * pageSize up to 500", () => {
    expect(searchRetrieveLimit(1, 20)).toBe(80);
    expect(searchRetrieveLimit(5, 20)).toBe(100);
    expect(searchRetrieveLimit(40, 20)).toBe(500);
  });
});

describe("jsonError", () => {
  it("adds a request id header and body field", async () => {
    const response = jsonError(new Error("secret stack"));
    const requestId = response.headers.get("x-request-id");
    expect(requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    const body = (await response.json()) as { error: string; requestId?: string };
    expect(body.error).toBe("Internal server error");
    expect(body.requestId).toBe(requestId);
  });
});

describe("signup confirmation", () => {
  it("does not admin-create users with email_confirm", () => {
    const signup = readFileSync(
      path.join(process.cwd(), "src/app/api/auth/signup/route.ts"),
      "utf8",
    );
    const register = readFileSync(
      path.join(process.cwd(), "src/services/auth/register-user.ts"),
      "utf8",
    );
    expect(signup).toContain("fallback: true");
    expect(signup).not.toMatch(/auth\.admin\.createUser/);
    expect(register).not.toContain("email_confirm");
  });
});
