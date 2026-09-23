export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const IMAGE_SIZE_LIMITS = {
  avatar: 2 * 1024 * 1024,
  employeePhoto: 2 * 1024 * 1024,
  clientLogo: 2 * 1024 * 1024,
  projectThumbnail: 2 * 1024 * 1024,
  expenseReceipt: 5 * 1024 * 1024,
} as const;

export type ImageUploadContext = keyof typeof IMAGE_SIZE_LIMITS;

export type ClientUploadedImageAsset = {
  url: string;
  publicId: string;
};

export function validateImageFile(
  file: File,
  context: ImageUploadContext,
): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "Format gambar tidak valid. Gunakan JPG, PNG, atau WEBP.";
  }

  const maxSize = IMAGE_SIZE_LIMITS[context];

  if (file.size <= 0 || file.size > maxSize) {
    const maxSizeMb = maxSize / 1024 / 1024;
    return `Ukuran gambar maksimal ${maxSizeMb} MB.`;
  }

  return null;
}

export async function uploadImageToCloudinary(
  file: File,
  folder: string,
): Promise<ClientUploadedImageAsset> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const response = await fetch("/api/uploads/images", {
    method: "POST",
    body: formData,
  });
  const result = (await response.json()) as Partial<ClientUploadedImageAsset> & {
    message?: string;
  };

  if (!response.ok || !result.url || !result.publicId) {
    throw new Error(result.message ?? "Upload gambar gagal.");
  }

  return {
    url: result.url,
    publicId: result.publicId,
  };
}
