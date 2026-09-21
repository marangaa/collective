import { describe, expect, test } from "bun:test";

import { resolveEntityName, type ResolvableEntity } from "./resolve";

const entities: ResolvableEntity[] = [
  { id: "project-1", type: "project", name: "Kawangware Level II Health Centre", normalized: "kawangware level ii health centre" },
  { id: "org-1", type: "organization", name: "XYZ Limited", normalized: "xyz limited" },
  { id: "project-2", type: "project", name: "Pumwani Maternity Wing", normalized: "pumwani maternity wing" },
];

describe("resolveEntityName", () => {
  test("resolves canonical names without falling back to an arbitrary project", () => {
    expect(resolveEntityName("Kawangware Level II Health Centre", entities)).toMatchObject({
      entityId: "project-1",
      method: "exact_name",
      score: 1,
    });
  });

  test("resolves a known alias by normalized exact match", () => {
    const withAlias = [...entities, { id: "project-1", type: "project", name: "Kawangware HC", normalized: "kawangware hc" }];
    expect(resolveEntityName("kawangware hc", withAlias)).toMatchObject({ entityId: "project-1", method: "exact_alias" });
  });

  test("leaves unrelated names unresolved", () => {
    expect(resolveEntityName("A facility that is not in this corpus", entities)).toMatchObject({ entityId: null, method: "unresolved", score: 0 });
  });
});
