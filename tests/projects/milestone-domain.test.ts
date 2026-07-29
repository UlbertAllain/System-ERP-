import assert from "node:assert/strict";
import test from "node:test";

import { assertValidMilestoneStatusTransition } from "@/modules/projects/milestones/milestone-domain";

test("milestone mengikuti state machine", () => {
  assert.doesNotThrow(() =>
    assertValidMilestoneStatusTransition("PLANNED", "IN_PROGRESS"),
  );
  assert.doesNotThrow(() =>
    assertValidMilestoneStatusTransition("COMPLETED", "IN_PROGRESS"),
  );
});

test("milestone menolak loncatan status", () => {
  assert.throws(() =>
    assertValidMilestoneStatusTransition("PLANNED", "COMPLETED"),
  );
  assert.throws(() =>
    assertValidMilestoneStatusTransition("CANCELLED", "IN_PROGRESS"),
  );
});
