export async function uploadOwnerPhoto(input: {
  businessId: string;
  file: File;
  photoId: string;
}): Promise<{
  id: string;
  name: string;
  storagePath: string;
  previewUrl: string | null;
}> {
  const body = new FormData();
  body.set("businessId", input.businessId);
  body.set("photoId", input.photoId);
  body.set("file", input.file);

  const response = await fetch("/api/business/photos", {
    method: "POST",
    body,
  });
  const json = (await response.json().catch(() => ({}))) as {
    error?: string;
    photo?: {
      id: string;
      name: string;
      storagePath: string;
      previewUrl: string | null;
    };
  };
  if (!response.ok || !json.photo?.storagePath) {
    throw new Error(json.error ?? "Couldn’t upload photo.");
  }
  return json.photo;
}
