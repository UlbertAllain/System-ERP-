import "server-only";

import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

function getRequiredEnv(key: string): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

cloudinary.config({
  cloud_name: getRequiredEnv("CLOUDINARY_CLOUD_NAME"),
  api_key: getRequiredEnv("CLOUDINARY_API_KEY"),
  api_secret: getRequiredEnv("CLOUDINARY_API_SECRET"),
  secure: true,
});

export type CloudinaryImageAsset = {
  url: string;
  publicId: string;
};

export type UploadImageFromBufferParams = {
  buffer: Buffer;
  folder: string;
  publicId?: string;
};

export async function uploadImageFromBuffer({
  buffer,
  folder,
  publicId,
}: UploadImageFromBufferParams): Promise<CloudinaryImageAsset> {
  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: "image",
        overwrite: true,
      },
      (error, uploadResult) => {
        if (error) {
          reject(error);
          return;
        }

        if (!uploadResult) {
          reject(new Error("Cloudinary upload failed without result."));
          return;
        }

        resolve(uploadResult);
      },
    );

    uploadStream.end(buffer);
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

export async function deleteCloudinaryImage(publicId: string): Promise<void> {
  if (!publicId) {
    return;
  }

  await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
  });
}

export { cloudinary };
