import test from "node:test";
import assert from "node:assert/strict";

import { mergeRepresentativeWithPersonDetail } from "./orgchart-utils.ts";

test("mergeRepresentativeWithPersonDetail enriches mobile org-chart reps with contact fields", () => {
  const representative = {
    id: "rep_1",
    user: {
      id: 7,
      name: "Sara Rep",
      photoUrl: null,
    },
    role: "building_representative",
    scopeLevel: "building",
    isActive: true,
  };

  const merged = mergeRepresentativeWithPersonDetail(representative, {
    id: 7,
    name: "Sara Rep",
    email: "sara@example.com",
    phone: "+20123456789",
    photo_url: "https://example.com/photo.jpg",
    roles: ["building_representative"],
    managed_scopes: [],
  });

  assert.equal(merged.user.email, "sara@example.com");
  assert.equal(merged.user.phone, "+20123456789");
  assert.equal(merged.user.photoUrl, "https://example.com/photo.jpg");
});
