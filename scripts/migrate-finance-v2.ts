import "dotenv/config";

import { createHash } from "crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

import { addMoney, compareMoney, normalizeMoney, subtractMoney } from "../lib/domain/money";
import { deriveInvoicePaymentStatus } from "../modules/finance/domain/invoice-payment-state";
import type { InvoiceStatus } from "../types/invoice";

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

function normalizeInvoiceNumber(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

function getInvoiceNumberLockId(invoiceNumber: string): string {
  return createHash("sha256").update(invoiceNumber).digest("hex");
}

async function main() {
  initAdmin();
  const apply = process.argv.includes("--apply");
  const db = getFirestore();
  const invoicesSnap = await db.collection("invoices").get();
  const activeInvoices = invoicesSnap.docs.filter(
    (document) => !document.data().deletedAt,
  );
  const numberOwners = new Map<string, string>();

  for (const document of activeInvoices) {
    const invoiceNumber = normalizeInvoiceNumber(document.data().invoiceNumber);

    if (!invoiceNumber) {
      throw new Error(`Invoice ${document.id} tidak memiliki invoiceNumber.`);
    }

    const existingOwner = numberOwners.get(invoiceNumber);
    if (existingOwner && existingOwner !== document.id) {
      throw new Error(
        `Nomor invoice duplikat ${invoiceNumber}: ${existingOwner} dan ${document.id}.`,
      );
    }

    numberOwners.set(invoiceNumber, document.id);
  }

  const updates: Array<{
    invoiceId: string;
    invoiceNumber: string;
    paidAmount: number;
    remainingAmount: number;
    status: InvoiceStatus;
    paidAt: unknown;
  }> = [];

  for (const invoiceDoc of activeInvoices) {
    const invoice = invoiceDoc.data();
    const paymentsSnap = await db
      .collection("payments")
      .where("invoiceId", "==", invoiceDoc.id)
      .where("status", "==", "CONFIRMED")
      .get();
    const paidAmount = paymentsSnap.docs
      .filter((payment) => !payment.data().deletedAt)
      .reduce(
        (total, payment) => addMoney(total, Number(payment.data().amount ?? 0)),
        0,
      );
    const totalAmount = normalizeMoney(Number(invoice.totalAmount ?? 0));

    if (compareMoney(paidAmount, totalAmount) > 0) {
      throw new Error(
        `Invoice ${invoiceDoc.id} memiliki payment ${paidAmount} melebihi total ${totalAmount}.`,
      );
    }

    const previousStatus = String(invoice.status ?? "DRAFT") as InvoiceStatus;
    const status = deriveInvoicePaymentStatus(
      totalAmount,
      paidAmount,
      previousStatus,
    );

    updates.push({
      invoiceId: invoiceDoc.id,
      invoiceNumber: normalizeInvoiceNumber(invoice.invoiceNumber),
      paidAmount,
      remainingAmount: subtractMoney(totalAmount, paidAmount),
      status,
      paidAt: invoice.paidAt ?? null,
    });
  }

  console.table(updates);

  if (!apply) {
    console.log(
      "Dry run selesai. Jalankan `npm run migrate:finance-v2 -- --apply` untuk menulis perubahan.",
    );
    return;
  }

  for (let index = 0; index < updates.length; index += 200) {
    const batch = db.batch();

    for (const update of updates.slice(index, index + 200)) {
      const invoiceRef = db.collection("invoices").doc(update.invoiceId);
      const lockRef = db
        .collection("invoiceNumberLocks")
        .doc(getInvoiceNumberLockId(update.invoiceNumber));

      batch.update(invoiceRef, {
        invoiceNumber: update.invoiceNumber,
        paidAmount: update.paidAmount,
        remainingAmount: update.remainingAmount,
        status: update.status,
        paidAt:
          update.status === "PAID"
            ? (update.paidAt ?? FieldValue.serverTimestamp())
            : null,
        updatedAt: FieldValue.serverTimestamp(),
      });
      batch.set(lockRef, {
        invoiceId: update.invoiceId,
        invoiceNumber: update.invoiceNumber,
        migratedAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
  }

  console.log(`Migrasi ${updates.length} invoice berhasil diterapkan.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
