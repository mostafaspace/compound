import test from "node:test";
import assert from "node:assert/strict";

import { uatPersonaEmails, uatPersonaPassword } from "./login-personas.ts";

test("dev persona chips use the canonical release UAT credentials", () => {
  assert.equal(uatPersonaPassword, "uat-password-2026");
  assert.deepEqual(uatPersonaEmails, {
    admin: "compound-admin@uat.compound.local",
    resident: "resident-owner@uat.compound.local",
    security: "security-guard@uat.compound.local",
    board: "board-member@uat.compound.local",
  });
});
