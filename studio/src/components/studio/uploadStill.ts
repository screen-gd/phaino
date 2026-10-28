import type { Uploaded } from "./useStudio";

/**
 * The image upload path shared by UploadCard and the home drop-a-still
 * hand-off: demo keeps a data URL in memory, local posts to /api/uploads.
 */
export async function uploadStill(
  file: File,
  { demo }: { demo: boolean },
): Promise<Uploaded | null> {
  if (demo) {
    if (
      ![
        "image/png",
        "image/jpeg",
        "image/webp",
        "video/mp4",
        "video/quicktime",
        "video/webm",
      ].includes(file.type)
    ) {
      return null;
    }
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve(
          typeof reader.result === "string"
            ? {
                uploadId: crypto.randomUUID(),
                previewUrl: reader.result,
                name: file.name,
              }
            : null,
        );
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/uploads", { method: "POST", body: form });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    uploadId: string;
    previewUrl: string;
  };
  return { uploadId: data.uploadId, previewUrl: data.previewUrl, name: file.name };
}
