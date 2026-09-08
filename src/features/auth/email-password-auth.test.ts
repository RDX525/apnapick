import { describe, expect, it, vi } from "vitest";
import {
  friendlyAuthError,
  isAuthRateLimitError,
  isDuplicateSignupUser,
} from "@/features/auth/auth-errors";
import { establishEmailPasswordSession } from "@/features/auth/email-password-auth";

describe("friendlyAuthError", () => {
  it("maps signup mailer rate limits to a different-email hint, not a fake existing-account warning", () => {
    expect(
      friendlyAuthError({
        message: "email rate limit exceeded",
        code: "over_email_send_rate_limit",
      }),
    ).toMatch(/different email/i);
    expect(
      friendlyAuthError({
        message: "email rate limit exceeded",
        code: "over_email_send_rate_limit",
      }),
    ).not.toMatch(/already exist/i);
    expect(
      isAuthRateLimitError({
        message: "For security purposes, you can only request this after 60 seconds.",
      }),
    ).toBe(true);
  });
});

describe("isDuplicateSignupUser", () => {
  it("treats an empty identities list as an existing account", () => {
    expect(isDuplicateSignupUser({ identities: [] })).toBe(true);
    expect(isDuplicateSignupUser({ identities: [{ id: "1" }] })).toBe(false);
  });
});

describe("establishEmailPasswordSession", () => {
  it("signs an existing account in without calling signUp", async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: { session: { access_token: "t" } },
      error: null,
    });
    const signUp = vi.fn();
    const result = await establishEmailPasswordSession(
      { signInWithPassword, signUp },
      { email: "a@b.com", password: "password1", mode: "signup" },
    );
    expect(result).toEqual({ status: "authenticated" });
    expect(signUp).not.toHaveBeenCalled();
  });

  it("does not resend a confirmation email for an unconfirmed account", async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: { session: null },
      error: { message: "Email not confirmed", code: "email_not_confirmed" },
    });
    const signUp = vi.fn();
    const result = await establishEmailPasswordSession(
      { signInWithPassword, signUp },
      { email: "a@b.com", password: "password1", mode: "signup" },
    );
    expect(result).toEqual({ status: "needs_confirmation" });
    expect(signUp).not.toHaveBeenCalled();
  });

  it("creates a new account after invalid credentials", async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: { session: null },
      error: { message: "Invalid login credentials" },
    });
    const signUp = vi.fn().mockResolvedValue({
      data: { session: { access_token: "t" }, user: { identities: [{ id: "1" }] } },
      error: null,
    });
    const result = await establishEmailPasswordSession(
      { signInWithPassword, signUp },
      { email: "new@b.com", password: "password1", name: "Ada", mode: "signup" },
    );
    expect(result).toEqual({ status: "authenticated" });
    expect(signUp).toHaveBeenCalledOnce();
  });

  it("recovers from signup mailer rate limits by signing in", async () => {
    const signInWithPassword = vi
      .fn()
      .mockResolvedValueOnce({
        data: { session: null },
        error: { message: "Invalid login credentials" },
      })
      .mockResolvedValueOnce({
        data: { session: { access_token: "t" } },
        error: null,
      });
    const signUp = vi.fn().mockResolvedValue({
      data: { session: null, user: null },
      error: { message: "email rate limit exceeded", code: "over_email_send_rate_limit" },
    });
    const result = await establishEmailPasswordSession(
      { signInWithPassword, signUp },
      { email: "a@b.com", password: "password1", mode: "signup" },
    );
    expect(result).toEqual({ status: "authenticated" });
  });

  it("does not treat a mailer rate limit as an existing account after the user was deleted", async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: { session: null },
      error: { message: "Invalid login credentials" },
    });
    const signUp = vi.fn().mockResolvedValue({
      data: { session: null, user: null },
      error: { message: "email rate limit exceeded", code: "over_email_send_rate_limit" },
    });
    const result = await establishEmailPasswordSession(
      { signInWithPassword, signUp },
      { email: "deleted@b.com", password: "password1", mode: "signup" },
    );
    expect(result.status).toBe("error");
    if (result.status !== "error") throw new Error("expected error");
    expect(result.message).toMatch(/different email/i);
    expect(result.message).toMatch(/hour/i);
    expect(result.message).not.toMatch(/already exist/i);
  });

  it("still tells people to log in when the Auth user was never removed", async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: { session: null },
      error: { message: "Invalid login credentials" },
    });
    const signUp = vi.fn().mockResolvedValue({
      data: { session: null, user: null },
      error: { message: "User already registered", code: "email_exists" },
    });
    const result = await establishEmailPasswordSession(
      { signInWithPassword, signUp },
      { email: "still-there@b.com", password: "new-password1", mode: "signup" },
    );
    expect(result.status).toBe("error");
    if (result.status !== "error") throw new Error("expected error");
    expect(result.message).toMatch(/already exists/i);
  });
});
