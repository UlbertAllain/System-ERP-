import { NextResponse } from "next/server";

import { getCurrentUserFromSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions/guard";
import type { PermissionSlug } from "@/constants/permissions";
import { uploadImageFromBuffer } from "@/lib/cloudinary/server";

const ALLOWED_UPLOADS = [
  {
    pattern: /^erp\/employees\/[A-Za-z0-9_-]+\/photo$/,
    maxBytes: 2 * 1024 * 1024,
    permission: "employee.photo.update" satisfies PermissionSlug,
  },
  {
    pattern: /^erp\/clients\/[A-Za-z0-9_-]+\/logo$/,
    maxBytes: 2 * 1024 * 1024,
    permission: "client.logo.update" satisfies PermissionSlug,
  },
  {
    pattern: /^erp\/settings\/company\/logo$/,
    maxBytes: 2 * 1024 * 1024,
    permission: "setting.company.update" satisfies PermissionSlug,
  },
] as const;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function hasValidImageSignature(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8;
  }

  if (mimeType === "image/png") {
    return (
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      )
    );
  }

  if (mimeType === "image/webp") {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }

  return false;
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUserFromSession();

    if (!currentUser || currentUser.mustChangePassword) {
      return NextResponse.json(
        { message: "Session tidak valid. Silakan login ulang." },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const folder = formData.get("folder");

    if (!(file instanceof File) || typeof folder !== "string") {
      return NextResponse.json(
        { message: "File dan tujuan upload wajib diisi." },
        { status: 400 },
      );
    }

    const uploadPolicy = ALLOWED_UPLOADS.find(({ pattern }) =>
      pattern.test(folder),
    );

    if (!uploadPolicy) {
      return NextResponse.json(
        { message: "Tujuan upload tidak diizinkan." },
        { status: 400 },
      );
    }

    if (!hasPermission(currentUser, uploadPolicy.permission)) {
      return NextResponse.json(
        { message: "Anda tidak memiliki izin untuk mengunggah gambar ini." },
        { status: 403 },
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { message: "Format gambar tidak valid. Gunakan JPG, PNG, atau WEBP." },
        { status: 400 },
      );
    }

    if (file.size <= 0 || file.size > uploadPolicy.maxBytes) {
      return NextResponse.json(
        { message: "Ukuran gambar maksimal 2 MB." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (!hasValidImageSignature(buffer, file.type)) {
      return NextResponse.json(
        { message: "Isi file tidak sesuai dengan format gambar." },
        { status: 400 },
      );
    }

    const uploadedImage = await uploadImageFromBuffer({
      buffer,
      folder,
    });

    return NextResponse.json(uploadedImage, { status: 201 });
  } catch (error) {
    console.error("[image-upload]", error);

    return NextResponse.json(
      { message: "Upload gambar gagal. Silakan coba kembali." },
      { status: 500 },
    );
  }
}
