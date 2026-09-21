
import type { Database } from "@collective/db";
import { entities, entityAliases } from "@collective/db/schema";

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export type ResolvableEntity = {
  id: string;
  type: string;
  name: string;
  normalized: string;
};

export type Resolution = {
  entityId: string | null;
  method: "exact_name" | "exact_alias" | "token_overlap" | "unresolved";
  score: number;
};

export async function loadResolvableEntities(db: Database): Promise<ResolvableEntity[]> {
  const rows = await db
    .select({ id: entities.id, type: entities.type, name: entities.canonicalName })
    .from(entities);
  const aliases = await db
    .select({ entityId: entityAliases.entityId, alias: entityAliases.alias })
    .from(entityAliases);

  const byId = new Map(rows.map((row) => [row.id, row]));
  const values: ResolvableEntity[] = rows.map((row) => ({
    id: row.id,
    type: row.type,
    name: row.name,
    normalized: normalize(row.name),
  }));

  for (const alias of aliases) {
    const entity = byId.get(alias.entityId);
    if (entity) {
      values.push({
        id: entity.id,
        type: entity.type,
        name: alias.alias,
        normalized: normalize(alias.alias),
      });
    }
  }

  return values;
}

export function resolveEntityName(
  rawName: string | null | undefined,
  entitiesToSearch: ResolvableEntity[],
): Resolution {
  if (!rawName?.trim()) return { entityId: null, method: "unresolved", score: 0 };
  const normalized = normalize(rawName);
  if (!normalized) return { entityId: null, method: "unresolved", score: 0 };

  const exact = entitiesToSearch.find((entity) => entity.normalized === normalized);
  if (exact) {
    return {
      entityId: exact.id,
      method: exact.name === rawName ? "exact_name" : "exact_alias",
      score: 1,
    };
  }

  const tokens = new Set(normalized.split(" ").filter((token) => token.length > 2));
  let best: { entity: ResolvableEntity; score: number } | null = null;
  for (const entity of entitiesToSearch) {
    const candidateTokens = new Set(entity.normalized.split(" ").filter((token) => token.length > 2));
    const overlap = [...tokens].filter((token) => candidateTokens.has(token)).length;
    const denominator = Math.max(tokens.size, candidateTokens.size);
    const score = denominator === 0 ? 0 : overlap / denominator;
    if (score >= 0.7 && (!best || score > best.score)) best = { entity, score };
  }

  return best
    ? { entityId: best.entity.id, method: "token_overlap", score: best.score }
    : { entityId: null, method: "unresolved", score: 0 };
}

export function resolutionJson(subject: Resolution, object: Resolution) {
  return {
    subject: subject,
    object: object,
    resolved: subject.entityId !== null,
  };
}

export function isProjectEntity(entityId: string | null, entitiesToSearch: ResolvableEntity[]) {
  return entitiesToSearch.some((entity) => entity.id === entityId && entity.type === "project");
}

