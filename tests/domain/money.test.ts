import assert from "node:assert/strict";
import test from "node:test";

import {
  addMoney,
  compareMoney,
  normalizeMoney,
  subtractMoney,
  toMoneyMinorUnits,
} from "../../lib/domain/money";

test("operasi uang tidak mengalami drift 0.1 + 0.2", () => {
  assert.equal(addMoney(0.1, 0.2), 0.3);
});

test("nominal dibulatkan menjadi dua angka desimal", () => {
  assert.equal(normalizeMoney(10.005), 10.01);
  assert.equal(normalizeMoney(-10.005), -10.01);
});

test("pengurangan uang memakai minor units", () => {
  assert.equal(subtractMoney(1, 0.9), 0.1);
});

test("perbandingan uang konsisten terhadap pembulatan", () => {
  assert.equal(compareMoney(100.004, 100), 0);
  assert.ok(compareMoney(100.006, 100) > 0);
});

test("nominal tidak valid ditolak", () => {
  assert.throws(() => toMoneyMinorUnits(Number.NaN));
  assert.throws(() => toMoneyMinorUnits(Number.POSITIVE_INFINITY));
});
