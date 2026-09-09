// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import { createEmptyDraft } from "@/domain/onboarding/types";
import {
  clearLegacyAnonymousDraft,
  clearLocalDraft,
  loadLocalDraft,
  saveLocalDraft,
} from "@/services/onboarding/draft-persistence";

const USER_A = "11111111-1111-1111-1111-111111111111";
const USER_B = "22222222-2222-2222-2222-222222222222";

function installMemoryStorage() {
  const store = new Map<string, string>();
  const memory: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key) {
      return store.get(key) ?? null;
    },
    key(index) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key) {
      store.delete(key);
    },
    setItem(key, value) {
      store.set(key, value);
    },
  };
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: memory,
  });
}

describe("onboarding draft persistence", () => {
  beforeEach(() => {
    installMemoryStorage();
  });

  it("does not restore a draft unless a user id is present", () => {
    const draft = createEmptyDraft();
    draft.name = "Leftover Cafe";
    window.localStorage.setItem(
      "apnapick.onboarding.draft.v1",
      JSON.stringify({ draft, stepIndex: 3, updatedAt: new Date().toISOString() }),
    );

    expect(loadLocalDraft(null)).toBeNull();
    expect(loadLocalDraft(undefined)).toBeNull();
  });

  it("keeps drafts scoped to the signed-in user", () => {
    const draftA = { ...createEmptyDraft(), name: "Aromic Tales" };
    const draftB = { ...createEmptyDraft(), name: "Other Shop" };
    saveLocalDraft(USER_A, draftA, 2);
    saveLocalDraft(USER_B, draftB, 4);

    expect(loadLocalDraft(USER_A)?.draft.name).toBe("Aromic Tales");
    expect(loadLocalDraft(USER_A)?.stepIndex).toBe(2);
    expect(loadLocalDraft(USER_B)?.draft.name).toBe("Other Shop");
    expect(loadLocalDraft(null)).toBeNull();
  });

  it("clears leftover anonymous drafts without touching another user's draft", () => {
    const draft = { ...createEmptyDraft(), name: "Aromic Tales" };
    saveLocalDraft(USER_A, draft, 1);
    window.localStorage.setItem(
      "apnapick.onboarding.draft.v1",
      JSON.stringify({ draft, stepIndex: 5, updatedAt: new Date().toISOString() }),
    );

    clearLegacyAnonymousDraft();
    expect(window.localStorage.getItem("apnapick.onboarding.draft.v1")).toBeNull();
    expect(loadLocalDraft(USER_A)?.draft.name).toBe("Aromic Tales");

    clearLocalDraft(USER_A);
    expect(loadLocalDraft(USER_A)).toBeNull();
  });
});
