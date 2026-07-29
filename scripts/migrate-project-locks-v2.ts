import "dotenv/config";

import { createHash } from "crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function initAdmin() {
  if (getApps().length > 0) return;

  initializeApp({
    credential: cert({
      projectId: getRequiredEnv("FIREBASE_PROJECT_ID"),
      clientEmail: getRequiredEnv("FIREBASE_CLIENT_EMAIL"),
      privateKey: getRequiredEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    }),
  });
}

function normalizeProjectCode(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

function getProjectCodeLockId(projectCode: string): string {
  return createHash("sha256").update(projectCode).digest("hex");
}

async function main() {
  initAdmin();
  const apply = process.argv.includes("--apply");
  const db = getFirestore();
  const projectsSnap = await db.collection("projects").get();
  const activeProjects = projectsSnap.docs.filter(
    (document) => !document.data().deletedAt,
  );
  const owners = new Map<string, string>();
  const locks: Array<{ projectId: string; projectCode: string }> = [];

  for (const document of activeProjects) {
    const projectCode = normalizeProjectCode(document.data().projectCode);

    if (!projectCode) {
      throw new Error(`Project ${document.id} tidak memiliki projectCode.`);
    }

    const existingOwner = owners.get(projectCode);
    if (existingOwner && existingOwner !== document.id) {
      throw new Error(
        `Kode project duplikat ${projectCode}: ${existingOwner} dan ${document.id}.`,
      );
    }

    owners.set(projectCode, document.id);
    locks.push({ projectId: document.id, projectCode });
  }

  console.table(locks);

  if (!apply) {
    console.log(
      "Dry run selesai. Jalankan `npm run migrate:project-locks-v2 -- --apply` untuk menulis lock.",
    );
    return;
  }

  for (let index = 0; index < locks.length; index += 400) {
    const batch = db.batch();

    for (const lock of locks.slice(index, index + 400)) {
      const lockRef = db
        .collection("projectCodeLocks")
        .doc(getProjectCodeLockId(lock.projectCode));

      batch.set(lockRef, {
        projectId: lock.projectId,
        projectCode: lock.projectCode,
        migratedAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
  }

  console.log(`Migrasi ${locks.length} project code lock berhasil diterapkan.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
