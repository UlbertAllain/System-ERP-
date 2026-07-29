import assert from "node:assert/strict";
import test from "node:test";

import {
  assertValidTaskDateRange,
  assertValidTaskStatusTransition,
} from "@/modules/projects/tasks/task-domain";

test("task mengikuti transisi status yang diizinkan", () => {
  assert.doesNotThrow(() =>
    assertValidTaskStatusTransition("TODO", "IN_PROGRESS"),
  );
  assert.doesNotThrow(() =>
    assertValidTaskStatusTransition("DONE", "IN_PROGRESS"),
  );
});

test("task menolak loncatan status yang tidak valid", () => {
  assert.throws(() =>
    assertValidTaskStatusTransition("TODO", "DONE"),
  );
  assert.throws(() =>
    assertValidTaskStatusTransition("CANCELLED", "DONE"),
  );
});

test("tanggal task harus berurutan", () => {
  assert.doesNotThrow(() =>
    assertValidTaskDateRange("2026-07-01", "2026-07-31"),
  );
  assert.throws(() =>
    assertValidTaskDateRange("2026-07-31", "2026-07-01"),
  );
});
