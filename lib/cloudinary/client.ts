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

type CloudinaryUploadSuccessResponse = {
  secure_url: string;
  public_id: string;
};

type CloudinaryUploadErrorResponse = {
  error?: {
    message?: string;
  };
};

export function validateImageFile(
  file: File,
  context: ImageUploadContext,
): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "Format gambar tidak valid. Gunakan JPG, PNG, atau WEBP.";
  }

  const maxSize = IMAGE_SIZE_LIMITS[context];

  if (file.size > maxSize) {
    const maxSizeMb = maxSize / 1024 / 1024;
    return `Ukuran gambar maksimal ${maxSizeMb} MB.`;
  }

  return null;
}

export async function uploadImageToCloudinaryUnsigned(
  file: File,
  folder: string,
): Promise<ClientUploadedImageAsset> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      "Cloudinary env belum lengkap. Cek NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME dan NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.",
    );
  }

  const formData = new FormData();

  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  const result = (await response.json()) as
    | CloudinaryUploadSuccessResponse
    | CloudinaryUploadErrorResponse;

  if (!response.ok) {
    const cloudinaryMessage =
      "error" in result ? result.error?.message : undefined;

    throw new Error(
      cloudinaryMessage ??
        `Upload Cloudinary gagal. Status: ${response.status}`,
    );
  }

  if (!("secure_url" in result) || !("public_id" in result)) {
    throw new Error("Upload Cloudinary berhasil tapi response tidak valid.");
  }

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}
