import assert from "node:assert/strict";
import test from "node:test";

import {
  buildInvoicePaymentProjection,
  deriveInvoicePaymentStatus,
} from "../../src/modules/finance/domain/invoice-payment-state";

test("invoice tanpa pembayaran tetap issued", () => {
  assert.equal(deriveInvoicePaymentStatus(1_000, 0, "ISSUED"), "ISSUED");
});

test("pembayaran sebagian menghasilkan PARTIALLY_PAID", () => {
  assert.deepEqual(buildInvoicePaymentProjection(1_000, 400, "ISSUED"), {
    paidAmount: 400,
    remainingAmount: 600,
    status: "PARTIALLY_PAID",
  });
});

test("pembayaran penuh menghasilkan PAID", () => {
  assert.equal(deriveInvoicePaymentStatus(1_000, 1_000, "ISSUED"), "PAID");
});

test("reversal pembayaran penuh kembali menjadi issued", () => {
  assert.equal(deriveInvoicePaymentStatus(1_000, 0, "PAID"), "ISSUED");
});

test("invoice void tidak berubah status", () => {
  assert.equal(deriveInvoicePaymentStatus(1_000, 0, "VOID"), "VOID");
});

test("projection menolak pembayaran berlebih", () => {
  assert.throws(() => buildInvoicePaymentProjection(1_000, 1_001, "ISSUED"));
});
