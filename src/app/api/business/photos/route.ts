import type { NextRequest } from "next/server";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/db/supabase-server";
import { BUSINESS_PHOTOS_BUCKET, ownerPhotoObjectPath } from "@/lib/media/photo-storage";
import { resolvePhotoUrl } from "@/lib/media/photo-url";
import { rateLimit } from "@/lib/security/rate-limit";
import { canManageBusiness } from "@/services/business/ownership";
import { getBusinessEntitlements } from "@/services/billing/subscription-service";
import {
  PHOTO_LIMITS,
  photoErrorMessage,
  validatePhotoBytes,
} from "@/services/onboarding/photo-validation";

export const dynamic = "force-dynamic";

const BUSINESS_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Upload a listing photo into the business-photos bucket.
 * The workspace save then inserts/updates the photos row.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      throw new AppError({
        message: "Login required",
        code: "UNAUTHORIZED",
        status: 401,
        expose: true,
      });
    }

    const limited = await rateLimit(`photos:upload:${user.id}`, 20, 60_000);
    if (!limited.allowed) {
      throw new AppError({
        message: "Too many uploads. Try again in a minute.",
        code: "RATE_LIMITED",
        status: 429,
        expose: true,
      });
    }

    const form = await request.formData();
    const businessId = String(form.get("businessId") ?? "");
    const photoIdRaw = String(form.get("photoId") ?? "");
    const uploaded = form.get("file");

    if (!BUSINESS_ID_RE.test(businessId)) {
      throw new AppError({
        message: "Business required",
        code: "VALIDATION_ERROR",
        status: 400,
        expose: true,
      });
    }
    if (!(uploaded instanceof Blob) || uploaded.size <= 0) {
      throw new AppError({
        message: "Choose a photo to upload.",
        code: "VALIDATION_ERROR",
        status: 400,
        expose: true,
      });
    }

    const file = uploaded;
    const fileName = uploaded instanceof File ? uploaded.name : "photo";

    const photoId = BUSINESS_ID_RE.test(photoIdRaw) ? photoIdRaw : crypto.randomUUID();
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      throw new AppError({
        message: "Photo storage isn’t configured.",
        code: "STORAGE_UNAVAILABLE",
        status: 503,
        expose: true,
      });
    }

    const { data: membership } = await supabase
      .from("business_members")
      .select("business_id, user_id, role, permissions")
      .eq("business_id", businessId)
      .eq("user_id", user.id)
      .maybeSingle();

    const allowed = canManageBusiness({
      userId: user.id,
      roles: user.roles,
      membership: membership
        ? {
            businessId: membership.business_id as string,
            userId: membership.user_id as string,
            role: membership.role as "OWNER" | "STAFF",
            permissions: membership.permissions,
          }
        : null,
    });
    if (!allowed) {
      throw new AppError({
        message: "Forbidden",
        code: "FORBIDDEN",
        status: 403,
        expose: true,
      });
    }

    const { features } = await getBusinessEntitlements(businessId);
    const maxGallery = Math.min(PHOTO_LIMITS.maxGallery, features.maxPhotos);
    const { count } = await supabase
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .is("deleted_at", null);

    const bytes = new Uint8Array(await file.arrayBuffer());
    const validation = validatePhotoBytes(bytes, {
      galleryCount: count ?? 0,
      maxGallery,
    });
    if ("error" in validation) {
      throw new AppError({
        message: photoErrorMessage(validation.error, maxGallery),
        code: "VALIDATION_ERROR",
        status: validation.error === "too_many" ? 402 : 400,
        expose: true,
      });
    }

    const objectPath = ownerPhotoObjectPath(businessId, photoId, validation.mime);
    const upload = await supabase.storage
      .from(BUSINESS_PHOTOS_BUCKET)
      .upload(objectPath, Buffer.from(bytes), {
        contentType: validation.mime,
        upsert: false,
      });

    if (upload.error) {
      throw new AppError({
        message:
          upload.error.message.includes("Bucket not found") ||
          upload.error.message.includes("not found")
            ? "Photo storage isn’t ready. Apply the latest database migrations."
            : "Couldn’t upload photo.",
        code: "PHOTO_UPLOAD_FAILED",
        status: 400,
        expose: true,
        cause: upload.error,
      });
    }

    return jsonOk({
      photo: {
        id: photoId,
        name: fileName,
        storagePath: objectPath,
        previewUrl: resolvePhotoUrl(objectPath),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
