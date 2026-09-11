"use client";

import { ArrowDown, ArrowUp, ImagePlus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { EmptyState } from "@/components/states/empty-state";
import type { DashboardPhoto } from "@/domain/dashboard/types";
import {
  photoErrorMessage,
  validatePhotoFile,
} from "@/services/onboarding/photo-validation";
import { reorderById } from "@/services/dashboard/insights";
import { uploadOwnerPhoto } from "@/services/dashboard/upload-owner-photo";
import { useDashboard } from "@/features/dashboard/dashboard-provider";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";
import { useState } from "react";

type PendingUpload = { id: string; name: string };

export function PhotosManagerPage() {
  const { workspace, update } = useDashboard();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const photos = [...workspace.photos].sort((a, b) => a.sortOrder - b.sortOrder);
  const businessId = workspace.profile.businessId;

  function setPhotos(next: DashboardPhoto[]) {
    update((w) => ({ ...w, photos: next }));
  }

  async function onUpload(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    if (!businessId) {
      setError("Photos save after you sign in with an approved listing.");
      return;
    }

    let galleryCount = photos.length + pending.length;
    for (const file of Array.from(files)) {
      const err = validatePhotoFile(file, { galleryCount });
      if (err) {
        setError(photoErrorMessage(err));
        continue;
      }
      const photoId = crypto.randomUUID();
      setPending((current) => [...current, { id: photoId, name: file.name }]);
      try {
        const uploaded = await uploadOwnerPhoto({
          businessId,
          file,
          photoId,
        });
        galleryCount += 1;
        update((w) => {
          const next = [...w.photos];
          next.push({
            id: uploaded.id,
            role: next.length === 0 ? "cover" : "gallery",
            name: uploaded.name,
            previewUrl: uploaded.previewUrl,
            storagePath: uploaded.storagePath,
            sortOrder: next.length,
            isCover: next.length === 0,
          });
          return { ...w, photos: next };
        });
      } catch (uploadError) {
        setError(
          uploadError instanceof Error ? uploadError.message : "Couldn’t upload photo.",
        );
      } finally {
        setPending((current) => current.filter((item) => item.id !== photoId));
      }
    }
  }

  function setCover(id: string) {
    setPhotos(
      photos.map((p) => ({
        ...p,
        isCover: p.id === id,
        role: p.id === id ? "cover" : p.role === "logo" ? "logo" : "gallery",
      })),
    );
  }

  function deletePhoto(photo: DashboardPhoto) {
    const remaining = photos.filter((item) => item.id !== photo.id);
    if (photo.isCover && remaining[0] && !remaining.some((item) => item.isCover)) {
      remaining[0] = { ...remaining[0], isCover: true, role: "cover" };
    }
    setPhotos(remaining.map((item, index) => ({ ...item, sortOrder: index })));
  }

  return (
    <DashboardShell
      activePath="/business/dashboard/photos"
      title="Photos"
      description="Upload, reorder, delete, and set your cover image."
    >
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <label className="border-border/80 bg-mist/40 hover:border-sea/40 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-12 text-sm transition">
        <ImagePlus className="text-sea size-6" aria-hidden />
        Upload photos
        <span className="text-muted-foreground text-xs">
          JPEG, PNG, WebP, GIF · max 5 MB · stored on your listing
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="sr-only"
          onChange={(e) => {
            void onUpload(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {pending.length > 0 ? (
        <ul className="space-y-2" aria-live="polite">
          {pending.map((item) => (
            <li
              key={item.id}
              className="border-border/70 bg-card rounded-xl border px-4 py-3 text-sm"
            >
              Uploading {item.name}…
            </li>
          ))}
        </ul>
      ) : null}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {photos.length === 0 && pending.length === 0 ? (
          <li className="sm:col-span-2 lg:col-span-3">
            <EmptyState
              compact
              title="No photos yet"
              description="Upload a cover photo and gallery images to help customers recognize your business."
            />
          </li>
        ) : null}
        {photos.map((photo, index) => (
          <li
            key={photo.id}
            className="border-border/70 bg-card overflow-hidden rounded-2xl border"
          >
            <div className="ap-media-gradient relative aspect-[4/3]">
              {photo.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo.previewUrl}
                  alt={`Preview of ${photo.name}`}
                  className="absolute inset-0 size-full object-cover"
                />
              ) : null}
              {photo.isCover ? (
                <Badge className="bg-accent text-accent-foreground absolute top-2 left-2">
                  Cover
                </Badge>
              ) : null}
            </div>
            <div className="space-y-2 p-3">
              <p className="truncate text-sm font-medium">{photo.name}</p>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={index === 0}
                  aria-label="Move earlier"
                  onClick={() => setPhotos(reorderById(photos, photo.id, "up"))}
                >
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={index === photos.length - 1}
                  aria-label="Move later"
                  onClick={() => setPhotos(reorderById(photos, photo.id, "down"))}
                >
                  <ArrowDown className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={photo.isCover}
                  onClick={() => setCover(photo.id)}
                >
                  <Star className="size-3.5" aria-hidden />
                  Cover
                </Button>
                <ConfirmationDialog
                  title={`Delete ${photo.name}?`}
                  description="This permanently removes the photo from your business gallery."
                  confirmLabel="Delete photo"
                  onConfirm={() => deletePhoto(photo)}
                  trigger={
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      aria-label={`Delete ${photo.name}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  }
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </DashboardShell>
  );
}
