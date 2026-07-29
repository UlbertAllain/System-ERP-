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

function normalizeExpenseNumber(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

function getExpenseNumberLockId(expenseNumber: string): string {
  return createHash("sha256").update(expenseNumber).digest("hex");
}

async function main() {
  initAdmin();
  const apply = process.argv.includes("--apply");
  const db = getFirestore();
  const expensesSnap = await db.collection("expenses").get();
  const activeExpenses = expensesSnap.docs.filter(
    (document) => !document.data().deletedAt,
  );
  const owners = new Map<string, string>();
  const locks: Array<{ expenseId: string; expenseNumber: string }> = [];

  for (const document of activeExpenses) {
    const expenseNumber = normalizeExpenseNumber(document.data().expenseNumber);

    if (!expenseNumber) {
      throw new Error(`Expense ${document.id} tidak memiliki expenseNumber.`);
    }

    const existingOwner = owners.get(expenseNumber);
    if (existingOwner && existingOwner !== document.id) {
      throw new Error(
        `Nomor expense duplikat ${expenseNumber}: ${existingOwner} dan ${document.id}.`,
      );
    }

    owners.set(expenseNumber, document.id);
    locks.push({ expenseId: document.id, expenseNumber });
  }

  console.table(locks);

  if (!apply) {
    console.log(
      "Dry run selesai. Jalankan `npm run migrate:expense-locks-v2 -- --apply` untuk menulis lock.",
    );
    return;
  }

  for (let index = 0; index < locks.length; index += 400) {
    const batch = db.batch();

    for (const lock of locks.slice(index, index + 400)) {
      const lockRef = db
        .collection("expenseNumberLocks")
        .doc(getExpenseNumberLockId(lock.expenseNumber));

      batch.set(lockRef, {
        expenseId: lock.expenseId,
        expenseNumber: lock.expenseNumber,
        migratedAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
  }

  console.log(`Migrasi ${locks.length} expense number lock berhasil diterapkan.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
