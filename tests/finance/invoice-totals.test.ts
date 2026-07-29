import assert from "node:assert/strict";
import test from "node:test";

import { calculateInvoiceTotals } from "../../modules/finance/invoices/invoice-domain";

test("total invoice dinormalisasi tanpa floating point drift", () => {
  const result = calculateInvoiceTotals({
    lineItems: [
      { description: "Layanan A", quantity: 1, unitPrice: 0.1 },
      { description: "Layanan B", quantity: 1, unitPrice: 0.2 },
    ],
    discountAmount: 0,
    taxAmount: 0,
  });

  assert.equal(result.subtotal, 0.3);
  assert.equal(result.totalAmount, 0.3);
});

test("quantity pecahan tetap menghasilkan nominal dua desimal", () => {
  const result = calculateInvoiceTotals({
    lineItems: [
      { description: "Jam konsultasi", quantity: 1.5, unitPrice: 100.005 },
    ],
    discountAmount: 10.01,
    taxAmount: 5.25,
  });

  assert.equal(result.lineItems[0]?.unitPrice, 100.01);
  assert.equal(result.lineItems[0]?.amount, 150.01);
  assert.equal(result.totalAmount, 145.25);
});

test("diskon lebih besar dari subtotal ditolak", () => {
  assert.throws(() =>
    calculateInvoiceTotals({
      lineItems: [{ description: "Layanan", quantity: 1, unitPrice: 100 }],
      discountAmount: 100.01,
      taxAmount: 0,
    }),
  );
});
