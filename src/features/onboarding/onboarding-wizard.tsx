"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Plus, Trash2, Upload, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ONBOARDING_STEPS,
  createEmptyDraft,
  type CatalogItemDraft,
  type OnboardingDraftPayload,
  type PhotoDraft,
} from "@/domain/onboarding/types";
import { computeCompleteness } from "@/services/onboarding/completeness";
import { loadLocalDraft, saveLocalDraft } from "@/services/onboarding/draft-persistence";
import { findDuplicateCandidates } from "@/services/onboarding/duplicate-detection";
import {
  photoErrorMessage,
  validatePhotoFile,
} from "@/services/onboarding/photo-validation";
import { isLikelyPune } from "@/validations/onboarding";
import {
  toDupCatalog,
  type ClaimableBusiness,
} from "@/repositories/onboarding/claimable-catalog";
import { DEFAULT_CATEGORIES } from "@/config/consumer-content";
import { cn } from "@/lib/utils";
import { OnboardingLocationPicker } from "@/features/onboarding/location-picker";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const ATTR_OPTIONS = [
  "vegetarian",
  "vegan",
  "jain",
  "outdoor_seating",
  "air-conditioned",
  "parking",
  "wifi",
];

function uid() {
  return crypto.randomUUID();
}

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [maxStepReached, setMaxStepReached] = useState(0);
  const [draft, setDraft] = useState<OnboardingDraftPayload>(createEmptyDraft);
  const [hydrated, setHydrated] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [matches, setMatches] = useState<ClaimableBusiness[]>([]);
  const [claimSearchStatus, setClaimSearchStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error" | "offline"
  >("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [, startHydrate] = useTransition();
  const [errors, setErrors] = useState<string[]>([]);
  const [catalogName, setCatalogName] = useState("");
  const [catalogPrice, setCatalogPrice] = useState("");
  const [menuCatName, setMenuCatName] = useState("");
  const skipInitialPersist = useRef(true);
  const saveSequence = useRef(0);
  const saveController = useRef<AbortController | null>(null);
  const saveTimer = useRef<number | null>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const photoObjectUrls = useRef(new Set<string>());
  const uploadTimers = useRef(new Set<number>());
  const latestDraft = useRef(draft);
  const latestStep = useRef(step);

  const completeness = useMemo(() => computeCompleteness(draft), [draft]);

  useEffect(() => {
    if (errors.length > 0) errorSummaryRef.current?.focus();
  }, [errors]);

  useEffect(
    () => () => {
      for (const url of photoObjectUrls.current) URL.revokeObjectURL(url);
      photoObjectUrls.current.clear();
      for (const timer of uploadTimers.current) window.clearTimeout(timer);
      uploadTimers.current.clear();
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setClaimSearchStatus("loading");
      try {
        const params = new URLSearchParams();
        if (findQuery.trim()) params.set("q", findQuery.trim());
        const res = await fetch(`/api/business/search?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("search failed");
        const json = (await res.json()) as { items?: ClaimableBusiness[] };
        setMatches(Array.isArray(json.items) ? json.items : []);
        setClaimSearchStatus("ready");
      } catch {
        if (controller.signal.aborted) return;
        setMatches([]);
        setClaimSearchStatus("error");
      }
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [findQuery]);

  const duplicates = useMemo(() => {
    if (draft.mode !== "create" || draft.name.trim().length < 3) return [];
    return findDuplicateCandidates(
      {
        name: draft.name,
        phone: draft.phone,
        website: draft.website,
        addressLine1: draft.addressLine1,
        suburb: draft.suburb,
        city: draft.city,
        lat: draft.lat,
        lng: draft.lng,
      },
      toDupCatalog(matches),
    );
  }, [
    draft.addressLine1,
    draft.city,
    draft.lat,
    draft.lng,
    draft.mode,
    draft.name,
    draft.phone,
    draft.suburb,
    draft.website,
    matches,
  ]);

  useEffect(() => {
    latestDraft.current = draft;
    latestStep.current = step;
  }, [draft, step]);

  useEffect(() => {
    startHydrate(() => {
      const saved = loadLocalDraft();
      if (saved) {
        setDraft(saved.draft);
        setStep(saved.stepIndex);
        setMaxStepReached(saved.stepIndex);
      }
      setHydrated(true);
    });
  }, []);

  const saveServerDraft = useCallback(
    async (
      nextDraft: OnboardingDraftPayload,
      nextStep: number,
      sequence: number,
      controller: AbortController,
    ) => {
      if (!navigator.onLine) {
        if (sequence === saveSequence.current) {
          setSaveStatus("offline");
          setSaveError("You’re offline. Your draft is safe on this device.");
        }
        return;
      }
      setSaveStatus("saving");
      setSaveError(null);
      try {
        const response = await fetch("/api/business/drafts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draft: nextDraft, stepIndex: nextStep }),
          signal: controller.signal,
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error ?? "Couldn’t sync your draft.");
        }
        if (sequence === saveSequence.current) {
          setSaveStatus("saved");
        }
      } catch (err) {
        if (controller.signal.aborted || sequence !== saveSequence.current) return;
        setSaveStatus(navigator.onLine ? "error" : "offline");
        setSaveError(
          navigator.onLine
            ? err instanceof Error
              ? err.message
              : "Couldn’t sync your draft."
            : "You’re offline. Your draft is safe on this device.",
        );
      }
    },
    [],
  );

  const retrySave = useCallback(() => {
    saveController.current?.abort();
    const controller = new AbortController();
    saveController.current = controller;
    const sequence = ++saveSequence.current;
    saveLocalDraft(latestDraft.current, latestStep.current);
    void saveServerDraft(latestDraft.current, latestStep.current, sequence, controller);
  }, [saveServerDraft]);

  useEffect(() => {
    if (!hydrated) return;
    if (skipInitialPersist.current) {
      skipInitialPersist.current = false;
      return;
    }
    saveController.current?.abort();
    if (saveTimer.current != null) window.clearTimeout(saveTimer.current);
    const controller = new AbortController();
    saveController.current = controller;
    const sequence = ++saveSequence.current;
    setSaveStatus(navigator.onLine ? "idle" : "offline");
    setSaveError(
      navigator.onLine ? null : "You’re offline. Your draft is safe on this device.",
    );
    saveTimer.current = window.setTimeout(() => {
      saveLocalDraft(draft, step);
      void saveServerDraft(draft, step, sequence, controller);
    }, 500);
    return () => {
      if (saveTimer.current != null) window.clearTimeout(saveTimer.current);
      controller.abort();
    };
  }, [draft, hydrated, saveServerDraft, step]);

  useEffect(() => {
    const offline = () => {
      saveController.current?.abort();
      saveSequence.current += 1;
      setSaveStatus("offline");
      setSaveError("You’re offline. Your draft is safe on this device.");
    };
    const online = () => retrySave();
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    return () => {
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
      saveController.current?.abort();
    };
  }, [retrySave]);

  function update(patch: Partial<OnboardingDraftPayload>) {
    setDraft((current) => ({ ...current, ...patch }));
    setErrors([]);
  }

  function go(nextStep: number) {
    const clamped = Math.max(0, Math.min(nextStep, ONBOARDING_STEPS.length - 1));
    if (clamped > maxStepReached) return;
    if (clamped > step) {
      const validationErrors = validateCurrent();
      if (validationErrors.length) {
        setErrors(validationErrors);
        return;
      }
    }
    setStep(clamped);
    setErrors([]);
  }

  function validateCurrent(): string[] {
    const e: string[] = [];
    if (step === 1) {
      if (draft.name.trim().length < 2) e.push("Business name is required.");
      if (!draft.categorySlug) e.push("Choose a category.");
      if (draft.description.trim().length < 20)
        e.push("Description should be at least 20 characters.");
      if (draft.phone.trim().length < 8) e.push("Enter a valid phone number.");
    }
    if (step === 2) {
      if (draft.addressLine1.trim().length < 3) e.push("Address is required.");
      if (!draft.suburb.trim()) e.push("Suburb / neighbourhood is required.");
      if (draft.lat == null || draft.lng == null) e.push("Set a map location.");
      else if (
        !Number.isFinite(draft.lat) ||
        !Number.isFinite(draft.lng) ||
        Math.abs(draft.lat) > 90 ||
        Math.abs(draft.lng) > 180
      ) {
        e.push("Coordinates are invalid.");
      }
    }
    return e;
  }

  function next() {
    const e = validateCurrent();
    if (e.length) {
      setErrors(e);
      return;
    }
    const nextStep = Math.min(step + 1, ONBOARDING_STEPS.length - 1);
    setMaxStepReached((current) => Math.max(current, nextStep));
    setStep(nextStep);
    setErrors([]);
  }

  function claimBusiness(b: ClaimableBusiness) {
    update({
      mode: "claim",
      claimBusinessId: b.id,
      claimBusinessName: b.name,
      claimStatus: "PENDING",
      name: b.name,
      suburb: b.suburb ?? "",
      city: b.city ?? "Pune",
      lat: b.lat,
      lng: b.lng,
      categorySlug: b.categoryLabel ?? "",
      verificationStatus: "PENDING",
    });
    setMaxStepReached((current) => Math.max(current, 1));
    setStep(1);
  }

  function createNew() {
    update({
      mode: "create",
      claimBusinessId: null,
      claimBusinessName: null,
      claimStatus: null,
      verificationStatus: "UNCLAIMED",
    });
    setMaxStepReached((current) => Math.max(current, 1));
    setStep(1);
  }

  async function onPhotosSelected(files: FileList | null, role: PhotoDraft["role"]) {
    if (!files?.length) return;
    const nextPhotos = [...draft.photos];
    for (const file of Array.from(files)) {
      const err = validatePhotoFile(file, {
        galleryCount: nextPhotos.filter((p) => p.role === "gallery").length,
      });
      if (err) {
        setErrors([photoErrorMessage(err)]);
        continue;
      }
      const previewUrl = URL.createObjectURL(file);
      photoObjectUrls.current.add(previewUrl);
      const photo: PhotoDraft = {
        id: uid(),
        role,
        name: file.name,
        sizeBytes: file.size,
        mimeType: file.type,
        previewUrl,
        progress: 0,
      };
      nextPhotos.push(photo);
      // Simulate upload progress for UX (storage wired when Supabase bucket is ready)
      const uploadTimer = window.setTimeout(() => {
        uploadTimers.current.delete(uploadTimer);
        setDraft((d) => ({
          ...d,
          photos: d.photos.map((p) =>
            p.id === photo.id ? { ...p, progress: 100, storagePath: `local/${p.id}` } : p,
          ),
        }));
      }, 400);
      uploadTimers.current.add(uploadTimer);
    }
    update({ photos: nextPhotos });
  }

  function addCatalogItem(kind: CatalogItemDraft["kind"]) {
    const name = catalogName.trim();
    if (!name) return;
    const price = catalogPrice.trim() ? Math.round(Number(catalogPrice) * 100) : null;
    const item: CatalogItemDraft = {
      id: uid(),
      kind,
      name,
      description: "",
      priceCents: Number.isFinite(price) ? price : null,
      available: true,
      attributes: [],
    };
    update({ catalogItems: [...draft.catalogItems, item] });
    setCatalogName("");
    setCatalogPrice("");
  }

  function addMenuCategory() {
    const name = menuCatName.trim();
    if (!name) return;
    update({
      menuCategories: [...draft.menuCategories, { id: uid(), name, items: [] }],
    });
    setMenuCatName("");
  }

  function addMenuItem(categoryId: string) {
    const name = catalogName.trim() || "New item";
    const price = catalogPrice.trim() ? Math.round(Number(catalogPrice) * 100) : null;
    update({
      menuCategories: draft.menuCategories.map((c) =>
        c.id === categoryId
          ? {
              ...c,
              items: [
                ...c.items,
                {
                  id: uid(),
                  kind: "dish",
                  name,
                  description: "",
                  priceCents: Number.isFinite(price) ? price : null,
                  available: true,
                  attributes: [],
                },
              ],
            }
          : c,
      ),
    });
    setCatalogName("");
    setCatalogPrice("");
  }

  async function submit() {
    setPending(true);
    setErrors([]);
    saveController.current?.abort();
    if (saveTimer.current != null) window.clearTimeout(saveTimer.current);
    try {
      const res = await fetch("/api/business/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        data?: { ok?: boolean };
        error?: string;
      };
      if (!res.ok || body.data?.ok === false) {
        throw new Error(body.error ?? "Submission failed. Please try again.");
      }
      const submittedDraft = {
        ...draft,
        submittedAt: new Date().toISOString(),
        verificationStatus:
          draft.mode === "claim" ? "UNDER_REVIEW" : draft.verificationStatus,
        claimStatus: draft.mode === "claim" ? "UNDER_REVIEW" : draft.claimStatus,
      } satisfies OnboardingDraftPayload;
      setDraft(submittedDraft);
      saveLocalDraft(submittedDraft, step);
      setSaveStatus("saved");
      router.push("/business/dashboard?submitted=1");
    } catch (err) {
      setErrors([
        err instanceof Error
          ? err.message
          : "Submission failed. Your draft is still safe.",
      ]);
      setSaveStatus("error");
      setSaveError("Your draft is safe, but submission did not complete.");
    } finally {
      setPending(false);
    }
  }

  if (!hydrated) {
    return (
      <div className="ap-surface rounded-2xl p-8">
        <Progress value={30} aria-label="Loading onboarding progress" className="h-2" />
        <p className="text-muted-foreground mt-4 text-sm">Loading your progress…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="ap-surface rounded-2xl p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-foreground text-sm font-medium">
              Step {step + 1} of {ONBOARDING_STEPS.length}:{" "}
              {ONBOARDING_STEPS[step]?.label}
            </p>
            <p className="text-muted-foreground mt-1 text-xs" aria-live="polite">
              {completeness.score}% complete
              {" · "}
              {saveStatus === "idle"
                ? "Waiting to sync"
                : saveStatus === "saving"
                  ? "Saving…"
                  : saveStatus === "saved"
                    ? "Draft saved"
                    : saveStatus === "offline"
                      ? "Offline · saved on this device"
                      : "Sync failed"}
            </p>
            {(saveStatus === "error" || saveStatus === "offline") && saveError ? (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-destructive text-xs">{saveError}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  onClick={retrySave}
                >
                  Retry
                </Button>
              </div>
            ) : null}
          </div>
          <Button asChild variant="outline" size="sm" className="min-h-9">
            <Link href="/business/dashboard">Save & exit</Link>
          </Button>
        </div>
        <Progress
          value={completeness.score}
          aria-label="Onboarding completeness"
          className="mt-4 h-2"
        />
        <ol className="mt-4 flex gap-1 overflow-x-auto pb-1" aria-label="Steps">
          {ONBOARDING_STEPS.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => go(i)}
                disabled={i > maxStepReached}
                aria-current={i === step ? "step" : undefined}
                className={cn(
                  "min-h-11 rounded-full px-3 py-2 text-xs whitespace-nowrap",
                  i > maxStepReached && "cursor-not-allowed opacity-50",
                  i === step
                    ? "bg-primary text-primary-foreground"
                    : i < step
                      ? "bg-sea/15 text-sea"
                      : "bg-secondary text-muted-foreground",
                )}
              >
                {i + 1}. {s.label}
              </button>
            </li>
          ))}
        </ol>

        {errors.length > 0 ? (
          <div
            ref={errorSummaryRef}
            tabIndex={-1}
            role="alert"
            className="border-destructive/30 bg-destructive/5 text-destructive mt-4 rounded-xl border px-4 py-3 text-sm"
          >
            {errors.map((err) => (
              <p key={err}>{err}</p>
            ))}
          </div>
        ) : null}

        <div className="mt-6 space-y-5">
          {step === 0 ? (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-ink text-2xl">
                  Is your business already listed?
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Search by name, phone, address, or area — then claim a match or create a
                  new listing.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="find">Search businesses</Label>
                <Input
                  id="find"
                  value={findQuery}
                  onChange={(e) => setFindQuery(e.target.value)}
                  placeholder="Name, phone, address, Koregaon Park…"
                  className="min-h-11"
                />
              </div>
              {claimSearchStatus === "loading" ? (
                <p className="text-muted-foreground text-sm">
                  Searching published listings…
                </p>
              ) : null}
              {claimSearchStatus === "error" ? (
                <p className="text-destructive text-sm">
                  Couldn’t load listings. Check your connection and try again.
                </p>
              ) : null}
              {claimSearchStatus === "ready" && matches.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No published matches yet. Create a new listing if this is your business.
                </p>
              ) : null}
              <ul className="space-y-2">
                {matches.map((b) => (
                  <li
                    key={b.id}
                    className="border-border/70 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">{b.name}</p>
                      <p className="text-muted-foreground text-sm">
                        {[b.suburb, b.city].filter(Boolean).join(", ")}
                        {b.categoryLabel ? ` · ${b.categoryLabel}` : ""}
                        {b.isClaimed ? " · Claimed" : ""}
                      </p>
                    </div>
                    <Button
                      type="button"
                      className="min-h-10"
                      disabled={b.isClaimed}
                      onClick={() => claimBusiness(b)}
                    >
                      Claim this business
                    </Button>
                  </li>
                ))}
              </ul>
              <div className="border-border/80 bg-mist/50 rounded-xl border border-dashed p-5">
                <p className="font-medium">Can’t find it?</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Create a new business profile. We’ll warn you about possible duplicates
                  before you continue.
                </p>
                <Button type="button" className="mt-4 min-h-10" onClick={createNew}>
                  Create a new business
                </Button>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-4">
              <h2 className="font-display text-ink text-2xl">Business information</h2>
              {draft.mode === "claim" && draft.claimBusinessName ? (
                <Badge variant="secondary">Claiming {draft.claimBusinessName}</Badge>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="name">Business name</Label>
                <Input
                  id="name"
                  value={draft.name}
                  onChange={(e) => update({ name: e.target.value })}
                  className="min-h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={draft.description}
                  onChange={(e) => update({ description: e.target.value })}
                  rows={4}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={draft.categorySlug}
                    onValueChange={(value) => update({ categorySlug: value })}
                  >
                    <SelectTrigger id="category" className="w-full">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEFAULT_CATEGORIES.map((c) => (
                        <SelectItem key={c.slug} value={c.slug}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subcategory">Subcategory</Label>
                  <Input
                    id="subcategory"
                    value={draft.subcategorySlug}
                    onChange={(e) => update({ subcategorySlug: e.target.value })}
                    placeholder="e.g. North Indian"
                    className="min-h-11"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={draft.phone}
                    onChange={(e) => update({ phone: e.target.value })}
                    className="min-h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={draft.email}
                    onChange={(e) => update({ email: e.target.value })}
                    className="min-h-11"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={draft.website}
                    onChange={(e) => update({ website: e.target.value })}
                    placeholder="https://"
                    className="min-h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price range</Label>
                  <Select
                    value={draft.priceLevel ? String(draft.priceLevel) : undefined}
                    onValueChange={(value) =>
                      update({
                        priceLevel: value ? Number(value) : null,
                      })
                    }
                  >
                    <SelectTrigger id="price" className="w-full">
                      <SelectValue placeholder="Select price range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">₹ Budget</SelectItem>
                      <SelectItem value="2">₹₹ Moderate</SelectItem>
                      <SelectItem value="3">₹₹₹ Premium</SelectItem>
                      <SelectItem value="4">₹₹₹₹ Fine dining</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <p id="business-attributes-label" className="text-sm font-medium">
                  Attributes
                </p>
                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-labelledby="business-attributes-label"
                >
                  {ATTR_OPTIONS.map((attr) => {
                    const on = draft.attributes.includes(attr);
                    return (
                      <button
                        key={attr}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          update({
                            attributes: on
                              ? draft.attributes.filter((a) => a !== attr)
                              : [...draft.attributes, attr],
                          })
                        }
                        className={cn(
                          "min-h-11 rounded-full px-3 py-2 text-sm",
                          on
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground",
                        )}
                      >
                        {attr.replace(/_/g, " ")}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Keywords / tags</Label>
                <Input
                  id="tags"
                  value={draft.tags.join(", ")}
                  onChange={(e) =>
                    update({
                      tags: e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="chicken curry, family dining, …"
                  className="min-h-11"
                />
              </div>
              {duplicates.length > 0 ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <AlertTriangle
                      className="size-4 text-amber-700 dark:text-amber-300"
                      aria-hidden
                    />
                    Possible duplicates — claim instead of creating?
                  </p>
                  <ul className="mt-3 space-y-2">
                    {duplicates.map((d) => (
                      <li
                        key={d.businessId}
                        className="flex flex-wrap items-center justify-between gap-2 text-sm"
                      >
                        <span>
                          {d.name}
                          <span className="text-muted-foreground">
                            {" "}
                            · {d.reasons.join("; ")}
                          </span>
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            claimBusiness({
                              id: d.businessId,
                              name: d.name,
                              slug: d.slug,
                              phone: d.phone ?? null,
                              website: d.website ?? null,
                              addressLine1: null,
                              suburb: d.suburb ?? null,
                              city: d.city ?? null,
                              lat: null,
                              lng: null,
                              categoryLabel: draft.categorySlug || null,
                              isClaimed: false,
                            })
                          }
                        >
                          Claim this
                        </Button>
                      </li>
                    ))}
                  </ul>
                  <p className="text-muted-foreground mt-2 text-xs">
                    We never auto-merge listings without review.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <h2 className="font-display text-ink text-2xl">Location</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="onboarding-country">Country</Label>
                  <Input
                    id="onboarding-country"
                    value={draft.country}
                    onChange={(e) => update({ country: e.target.value })}
                    className="min-h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="onboarding-state">State / province</Label>
                  <Input
                    id="onboarding-state"
                    value={draft.state}
                    onChange={(e) => update({ state: e.target.value })}
                    className="min-h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="onboarding-city">City</Label>
                  <Input
                    id="onboarding-city"
                    value={draft.city}
                    onChange={(e) => update({ city: e.target.value })}
                    className="min-h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="onboarding-suburb">Suburb / neighbourhood</Label>
                  <Input
                    id="onboarding-suburb"
                    value={draft.suburb}
                    onChange={(e) => update({ suburb: e.target.value })}
                    className="min-h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="onboarding-postcode">Postcode</Label>
                  <Input
                    id="onboarding-postcode"
                    inputMode="numeric"
                    value={draft.postcode}
                    onChange={(e) => update({ postcode: e.target.value })}
                    className="min-h-11"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="onboarding-address">Street address</Label>
                  <Input
                    id="onboarding-address"
                    autoComplete="street-address"
                    value={draft.addressLine1}
                    onChange={(e) => update({ addressLine1: e.target.value })}
                    className="min-h-11"
                  />
                </div>
              </div>
              <OnboardingLocationPicker
                address={[
                  draft.addressLine1,
                  draft.suburb,
                  draft.city,
                  draft.state,
                  draft.postcode,
                  draft.country,
                ]
                  .filter(Boolean)
                  .join(", ")}
                lat={draft.lat}
                lng={draft.lng}
                onSelect={(result) =>
                  update({
                    lat: result.position.lat,
                    lng: result.position.lng,
                    suburb: result.areaSlug
                      ? result.areaSlug.replace(/-/g, " ")
                      : draft.suburb,
                  })
                }
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="lat">Latitude</Label>
                  <Input
                    id="lat"
                    type="number"
                    step="0.0001"
                    value={draft.lat ?? ""}
                    onChange={(e) =>
                      update({
                        lat: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    className="min-h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lng">Longitude</Label>
                  <Input
                    id="lng"
                    type="number"
                    step="0.0001"
                    value={draft.lng ?? ""}
                    onChange={(e) =>
                      update({
                        lng: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    className="min-h-11"
                  />
                </div>
              </div>
              {draft.lat != null &&
              draft.lng != null &&
              !isLikelyPune(draft.lat, draft.lng) ? (
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Coordinates look outside the Pune metro — double-check the pin.
                </p>
              ) : null}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-5">
              <h2 className="font-display text-ink text-2xl">Products & services</h2>
              <p className="text-muted-foreground text-sm">
                Add dishes, products, or services people search for. Restaurants can also
                build a menu tree.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={catalogName}
                  onChange={(e) => setCatalogName(e.target.value)}
                  placeholder="Item name"
                  className="min-h-11"
                />
                <Input
                  value={catalogPrice}
                  onChange={(e) => setCatalogPrice(e.target.value)}
                  placeholder="Price ₹"
                  className="min-h-11 sm:w-28"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addCatalogItem("dish")}
                >
                  <Plus className="size-4" aria-hidden /> Dish
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addCatalogItem("product")}
                >
                  <Plus className="size-4" aria-hidden /> Product
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addCatalogItem("service")}
                >
                  <Plus className="size-4" aria-hidden /> Service
                </Button>
              </div>
              <ul className="space-y-2">
                {draft.catalogItems.map((item) => (
                  <li
                    key={item.id}
                    className="border-border/70 flex items-start justify-between gap-3 rounded-xl border px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">
                        {item.name}{" "}
                        <Badge variant="outline" className="ml-1 text-[10px]">
                          {item.kind}
                        </Badge>
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {item.priceCents != null
                          ? `₹${(item.priceCents / 100).toFixed(0)}`
                          : "Price TBD"}
                        {item.available ? "" : " · Unavailable"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Remove ${item.name}`}
                      onClick={() =>
                        update({
                          catalogItems: draft.catalogItems.filter(
                            (i) => i.id !== item.id,
                          ),
                        })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>

              {draft.categorySlug === "restaurants" || draft.categorySlug === "cafes" ? (
                <div className="border-border/70 space-y-3 rounded-xl border p-4">
                  <p className="font-medium">Menu</p>
                  <p className="text-muted-foreground text-xs">
                    Example: Chicken → Chicken Curry → description → ₹18 → spicy
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={menuCatName}
                      onChange={(e) => setMenuCatName(e.target.value)}
                      placeholder="Menu category (e.g. Chicken)"
                      className="min-h-10"
                    />
                    <Button type="button" onClick={addMenuCategory}>
                      Add
                    </Button>
                  </div>
                  {draft.menuCategories.map((cat) => (
                    <div key={cat.id} className="bg-mist/60 rounded-lg p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sea text-sm font-medium">{cat.name}</p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => addMenuItem(cat.id)}
                        >
                          Add item
                        </Button>
                      </div>
                      <ul className="mt-2 space-y-1 text-sm">
                        {cat.items.map((item) => (
                          <li key={item.id} className="flex justify-between gap-2">
                            <span>{item.name}</span>
                            <span className="text-muted-foreground">
                              {item.priceCents != null
                                ? `₹${(item.priceCents / 100).toFixed(0)}`
                                : "—"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              <h2 className="font-display text-ink text-2xl">Opening hours</h2>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={draft.temporarilyClosed}
                  onCheckedChange={(checked) =>
                    update({ temporarilyClosed: checked === true })
                  }
                />
                Temporarily closed
              </label>
              <ul className="space-y-2">
                {draft.hours.map((h) => (
                  <li
                    key={h.dayOfWeek}
                    className="border-border/70 grid grid-cols-[3rem_1fr] items-center gap-3 rounded-xl border px-3 py-2 sm:grid-cols-[4rem_auto_1fr_1fr]"
                  >
                    <span className="text-sm font-medium">{DAY_LABELS[h.dayOfWeek]}</span>
                    <label className="flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={h.isClosed}
                        onCheckedChange={(checked) =>
                          update({
                            hours: draft.hours.map((x) =>
                              x.dayOfWeek === h.dayOfWeek
                                ? { ...x, isClosed: checked === true }
                                : x,
                            ),
                          })
                        }
                      />
                      Closed
                    </label>
                    {!h.isClosed ? (
                      <>
                        <Input
                          type="time"
                          aria-label={`${DAY_LABELS[h.dayOfWeek]} opening time`}
                          value={h.opensAt ?? ""}
                          onChange={(e) =>
                            update({
                              hours: draft.hours.map((x) =>
                                x.dayOfWeek === h.dayOfWeek
                                  ? { ...x, opensAt: e.target.value }
                                  : x,
                              ),
                            })
                          }
                          className="h-9"
                        />
                        <Input
                          type="time"
                          aria-label={`${DAY_LABELS[h.dayOfWeek]} closing time`}
                          value={h.closesAt ?? ""}
                          onChange={(e) =>
                            update({
                              hours: draft.hours.map((x) =>
                                x.dayOfWeek === h.dayOfWeek
                                  ? { ...x, closesAt: e.target.value }
                                  : x,
                              ),
                            })
                          }
                          className="h-9"
                        />
                      </>
                    ) : (
                      <span className="text-muted-foreground col-span-2 text-sm">—</span>
                    )}
                  </li>
                ))}
              </ul>
              <div className="space-y-2">
                <p className="text-sm font-medium">Special hours / holidays</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    update({
                      specialHours: [
                        ...draft.specialHours,
                        {
                          date: new Date().toISOString().slice(0, 10),
                          label: "Holiday",
                          isClosed: true,
                        },
                      ],
                    })
                  }
                >
                  Add special day
                </Button>
                <ul className="space-y-1 text-sm">
                  {draft.specialHours.map((s, i) => (
                    <li key={`${s.date}-${i}`} className="text-muted-foreground">
                      {s.date} · {s.label ?? "Special"} ·{" "}
                      {s.isClosed ? "Closed" : `${s.opensAt}–${s.closesAt}`}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          {step === 5 ? (
            <div className="space-y-4">
              <h2 className="font-display text-ink text-2xl">Photos</h2>
              <p className="text-muted-foreground text-sm">
                JPEG, PNG, WebP, or GIF · maximum 5 MB · up to 20 gallery photos.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {(
                  [
                    ["logo", "Logo"],
                    ["cover", "Cover"],
                    ["gallery", "Gallery"],
                  ] as const
                ).map(([role, label]) => (
                  <label
                    key={role}
                    className="border-border/80 bg-mist/40 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-8 text-sm"
                  >
                    <Upload className="text-sea size-5" aria-hidden />
                    {label}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      multiple={role === "gallery"}
                      onChange={(e) => onPhotosSelected(e.target.files, role)}
                    />
                  </label>
                ))}
              </div>
              <ul className="grid gap-3 sm:grid-cols-3">
                {draft.photos.map((p) => (
                  <li
                    key={p.id}
                    className="border-border/70 overflow-hidden rounded-xl border"
                  >
                    {p.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.previewUrl}
                        alt={`Preview of ${p.name}`}
                        className="aspect-video w-full object-cover"
                      />
                    ) : (
                      <div className="bg-mist aspect-video" />
                    )}
                    <div className="space-y-1 p-2 text-xs">
                      <p className="truncate font-medium">{p.name}</p>
                      <p className="text-muted-foreground">
                        {p.role} · {Math.round(p.sizeBytes / 1024)} KB
                      </p>
                      <Progress
                        value={p.progress ?? 0}
                        aria-label={`${p.name} upload progress`}
                        className="h-1.5"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {step === 6 ? (
            <div className="space-y-4">
              <h2 className="font-display text-ink text-2xl">Contact</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact-phone">Phone</Label>
                  <Input
                    id="contact-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={draft.phone}
                    onChange={(e) => update({ phone: e.target.value })}
                    className="min-h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={draft.email}
                    onChange={(e) => update({ email: e.target.value })}
                    className="min-h-11"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="contact-website">Website</Label>
                  <Input
                    id="contact-website"
                    type="url"
                    inputMode="url"
                    value={draft.website}
                    onChange={(e) => update({ website: e.target.value })}
                    className="min-h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-booking">Booking URL</Label>
                  <Input
                    id="contact-booking"
                    type="url"
                    inputMode="url"
                    value={draft.bookingUrl}
                    onChange={(e) => update({ bookingUrl: e.target.value })}
                    className="min-h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-order">Order URL</Label>
                  <Input
                    id="contact-order"
                    type="url"
                    inputMode="url"
                    value={draft.orderUrl}
                    onChange={(e) => update({ orderUrl: e.target.value })}
                    className="min-h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-instagram">Instagram</Label>
                  <Input
                    id="contact-instagram"
                    type="url"
                    inputMode="url"
                    value={draft.social.instagram ?? ""}
                    onChange={(e) =>
                      update({
                        social: { ...draft.social, instagram: e.target.value },
                      })
                    }
                    className="min-h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-facebook">Facebook</Label>
                  <Input
                    id="contact-facebook"
                    type="url"
                    inputMode="url"
                    value={draft.social.facebook ?? ""}
                    onChange={(e) =>
                      update({
                        social: { ...draft.social, facebook: e.target.value },
                      })
                    }
                    className="min-h-11"
                  />
                </div>
              </div>
            </div>
          ) : null}

          {step === 7 ? (
            <div className="space-y-4">
              <h2 className="font-display text-ink text-2xl">Public preview</h2>
              <p className="text-muted-foreground text-sm">
                This is how your profile will appear to customers.
              </p>
              <article className="ap-surface overflow-hidden rounded-[1.75rem]">
                <div className="ap-media-gradient relative min-h-40">
                  {draft.photos.find((p) => p.role === "cover")?.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={draft.photos.find((p) => p.role === "cover")!.previewUrl!}
                      alt=""
                      className="absolute inset-0 size-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="space-y-3 p-6">
                  <h3 className="font-display text-ink text-3xl">
                    {draft.name || "Your business name"}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {[draft.suburb, draft.city].filter(Boolean).join(", ") || "Location"}
                    {draft.categorySlug ? ` · ${draft.categorySlug}` : ""}
                  </p>
                  <p className="text-muted-foreground">
                    {draft.description || "Description will appear here."}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {draft.catalogItems.slice(0, 4).map((i) => (
                      <Badge key={i.id} variant="secondary">
                        {i.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </article>
              <Button type="button" variant="outline" onClick={() => go(1)}>
                Edit business info
              </Button>
            </div>
          ) : null}

          {step === 8 ? (
            <div className="space-y-5">
              <h2 className="font-display text-ink text-2xl">Submit for approval</h2>
              <div className="border-border/70 bg-mist/50 rounded-2xl border p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">Profile completeness</p>
                  <p className="font-display text-ink text-2xl">{completeness.score}%</p>
                </div>
                <Progress
                  value={completeness.score}
                  aria-label="Onboarding completeness"
                  className="mt-3 h-2"
                />
                <ul className="mt-4 space-y-2">
                  {completeness.groups.map((g) => (
                    <li key={g.id} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        {g.ok ? (
                          <CheckCircle2 className="text-sea size-4" aria-hidden />
                        ) : (
                          <span className="border-border size-4 rounded-full border" />
                        )}
                        {g.label}
                      </span>
                      <span className="text-muted-foreground">
                        {g.earned}/{g.weight}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              {completeness.missing.length > 0 ? (
                <div>
                  <p className="text-sm font-medium">Still missing</p>
                  <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-5 text-sm">
                    {completeness.missing.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="border-border/70 rounded-xl border p-4 text-sm">
                <p className="font-medium">Verification status</p>
                <p className="text-muted-foreground mt-1">
                  {draft.mode === "claim"
                    ? `Claim: ${draft.claimStatus ?? "PENDING"} — admin / document verification`
                    : "New listing will enter PENDING_REVIEW after submit"}
                </p>
              </div>
              <Button
                type="button"
                size="lg"
                className="min-h-11 w-full sm:w-auto"
                disabled={pending}
                onClick={submit}
              >
                {pending ? "Submitting…" : "Submit for approval"}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="border-border/60 mt-8 flex flex-wrap justify-between gap-3 border-t pt-5">
          <Button
            type="button"
            variant="outline"
            className="min-h-10"
            disabled={step === 0}
            onClick={() => go(step - 1)}
          >
            Back
          </Button>
          {step < ONBOARDING_STEPS.length - 1 ? (
            <Button type="button" className="min-h-10" onClick={next}>
              Continue
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
