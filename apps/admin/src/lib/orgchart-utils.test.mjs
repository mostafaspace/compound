import test from "node:test";
import assert from "node:assert/strict";

import {
  buildOrgChartTree,
  formatAssignableUserLabel,
  mergeRepresentativeWithPersonDetail,
  parseAssignmentUserId,
} from "./orgchart-utils.ts";

function makeRepresentative(overrides = {}) {
  return {
    id: "rep_1",
    userId: 9,
    user: {
      id: 9,
      name: "Sara Rep",
      photoUrl: null,
    },
    role: "building_representative",
    scopeLevel: "building",
    contactVisibility: "all_residents",
    isActive: true,
    ...overrides,
  };
}

test("mergeRepresentativeWithPersonDetail keeps representative shape while enriching contact data", () => {
  const rep = makeRepresentative();

  const merged = mergeRepresentativeWithPersonDetail(rep, {
    id: 9,
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
  assert.equal(merged.role, "building_representative");
});

test("parseAssignmentUserId accepts positive integers and rejects invalid values", () => {
  assert.equal(parseAssignmentUserId("42"), 42);
  assert.equal(parseAssignmentUserId(" 007 "), 7);
  assert.equal(parseAssignmentUserId(""), null);
  assert.equal(parseAssignmentUserId("abc"), null);
  assert.equal(parseAssignmentUserId("0"), null);
  assert.equal(parseAssignmentUserId("-5"), null);
  assert.equal(parseAssignmentUserId("3.14"), null);
});

test("buildOrgChartTree preserves floor units and residents for drill-down views", () => {
  const tree = buildOrgChartTree({
    compound: {
      id: "cmp_1",
      name: "Palm Heights",
      code: "PH",
      representatives: [],
    },
    buildings: [
      {
        id: "b_1",
        name: "Building A",
        code: "A",
        representatives: [],
        floors: [
          {
            id: "f_1",
            label: "Floor 1",
            representatives: [],
            units: [
              {
                id: "u_1",
                unitNumber: "101",
                residents: [{ id: 77, name: "Resident One" }],
              },
            ],
          },
        ],
      },
    ],
  });

  assert.equal(tree.children[0].children[0].units?.[0].unitNumber, "101");
  assert.equal(tree.children[0].children[0].units?.[0].residents[0].name, "Resident One");
});

test("buildOrgChartTree normalizes object and resource-style collections without crashing", () => {
  const tree = buildOrgChartTree({
    compound: {
      id: "cmp_1",
      name: "Palm Heights",
      code: "PH",
      representatives: {
        data: [],
      },
    },
    buildings: {
      b_1: {
        id: "b_1",
        name: "Building A",
        code: "A",
        representatives: {
          data: [],
        },
        floors: {
          f_1: {
            id: "f_1",
            label: "Floor 1",
            representatives: {
              data: [],
            },
            units: {
              u_1: {
                id: "u_1",
                unitNumber: "101",
                residents: [{ id: 77, name: "Resident One" }],
              },
            },
          },
        },
      },
    },
  });

  assert.equal(tree.children.length, 1);
  assert.equal(tree.children[0].children.length, 1);
  assert.equal(tree.children[0].children[0].units?.[0].unitNumber, "101");
});

test("buildOrgChartTree hydrates representative fallbacks when user payload is missing", () => {
  const tree = buildOrgChartTree({
    compound: {
      id: "cmp_1",
      name: "Palm Heights",
      code: "PH",
      representatives: [],
    },
    buildings: [
      {
        id: "b_1",
        name: "Building A",
        code: "A",
        representatives: [
          {
            id: "rep_1",
            userId: 44,
            user: null,
            role: "building_representative",
            scopeLevel: "building",
            contactVisibility: "all_residents",
            isActive: true,
          },
        ],
        floors: [],
      },
    ],
  });

  assert.equal(tree.children[0].representatives[0].user.id, 44);
  assert.equal(tree.children[0].representatives[0].user.name, "User #44");
  assert.equal(tree.children[0].representatives[0].user.photoUrl, null);
});

test("formatAssignableUserLabel prefers contact details when available", () => {
  assert.equal(
    formatAssignableUserLabel({ id: 1, name: "Sara Rep", email: "sara@example.com" }),
    "Sara Rep (sara@example.com)",
  );
  assert.equal(
    formatAssignableUserLabel({ id: 2, name: "Mahmoud Guard", phone: "+201000000000" }),
    "Mahmoud Guard (+201000000000)",
  );
  assert.equal(
    formatAssignableUserLabel({ id: 3, name: "Plain User" }),
    "Plain User",
  );
});
