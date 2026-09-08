"use client";

import { ArrowDown, ArrowUp, ImagePlus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { EmptyState } from "@/components/states/empty-state";
import type { DashboardPhoto } from "@/domain/dashboard/types";
import {
  photoErrorMessage,
  validatePhotoFile,
} from "@/services/onboarding/photo-validation";
import { reorderById } from "@/services/dashboard/insights";
import { useDashboard } from "@/features/dashboard/dashboard-provider";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";
import { useEffect, useRef, useState } from "react";

export function PhotosManagerPage() {
  const { workspace, update } = useDashboard();
  const [error, setError] = useState<string | null>(null);
  const objectUrls = useRef(new Set<string>());
  const photos = [...workspace.photos].sort((a, b) => a.sortOrder - b.sortOrder);

  useEffect(
    () => () => {
      for (const url of objectUrls.current) URL.revokeObjectURL(url);
      objectUrls.current.clear();
    },
    [],
  );

  function setPhotos(next: DashboardPhoto[]) {
    update((w) => ({ ...w, photos: next }));
  }

  async function onUpload(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const next = [...photos];
    for (const file of Array.from(files)) {
      const err = validatePhotoFile(file, { galleryCount: next.length });
      if (err) {
        setError(photoErrorMessage(err));
        continue;
      }
      const previewUrl = URL.createObjectURL(file);
      objectUrls.current.add(previewUrl);
      next.push({
        id: crypto.randomUUID(),
        role: next.length === 0 ? "cover" : "gallery",
        name: file.name,
        previewUrl,
        sortOrder: next.length,
        isCover: next.length === 0,
      });
    }
    setPhotos(next);
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
    if (photo.previewUrl && objectUrls.current.has(photo.previewUrl)) {
      URL.revokeObjectURL(photo.previewUrl);
      objectUrls.current.delete(photo.previewUrl);
    }
    setPhotos(photos.filter((item) => item.id !== photo.id));
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
          JPEG, PNG, WebP, GIF · max 5 MB
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="sr-only"
          onChange={(e) => onUpload(e.target.files)}
        />
      </label>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {photos.length === 0 ? (
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
              <Progress value={100} aria-label={`${photo.name} upload`} className="h-1" />
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
