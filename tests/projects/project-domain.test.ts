import assert from "node:assert/strict";
import test from "node:test";

import { assertValidProjectStatusTransition } from "@/modules/projects/projects/project-domain";

test("project mengikuti state machine", () => {
  assert.doesNotThrow(() =>
    assertValidProjectStatusTransition("PLANNING", "IN_PROGRESS"),
  );
  assert.doesNotThrow(() =>
    assertValidProjectStatusTransition("COMPLETED", "IN_PROGRESS"),
  );
});

test("project menolak loncatan status", () => {
  assert.throws(() =>
    assertValidProjectStatusTransition("PLANNING", "COMPLETED"),
  );
  assert.throws(() =>
    assertValidProjectStatusTransition("CANCELLED", "IN_PROGRESS"),
  );
});
