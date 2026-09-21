import { describe, expect, test } from "bun:test";

import { reconcileSubject, type EnrichedClaim, type ReportRow } from "./reconcile";

const claim = (overrides: Partial<EnrichedClaim>): EnrichedClaim => ({
  id: crypto.randomUUID(),
  subjectEntityId: "00000000-0000-0000-0000-000000000001",
  predicate: "asserted_status",
  objectEntityId: null,
  valueText: null,
  valueNumeric: null,
  valueUnit: null,
  valueDate: null,
  valueStatus: null,
  valuePct: null,
  assertion: "An assertion",
  stage: "implementation",
  documentId: null,
  mediaId: null,
  fieldReportId: null,
  span: { excerpt: "A sufficiently specific source excerpt for testing." },
  observedAt: "2026-09-01",
  publishedAt: null,
  extractedAt: new Date(),
  firstSeen: new Date(),
  lastSeen: new Date(),
  extractionMethod: "manual",
  confidence: "1",
  dimensions: { strength: 0.9 },
  reviewState: "approved",
  reviewedBy: null,
  reviewedAt: null,
  reviewAction: "approved",
  reviewNote: null,
  fromCandidateId: null,
  createdAt: new Date(),
  sourceId: "source-1",
  sourceType: "audit",
  trustTier: "official",
  strength: 0.9,
  ...overrides,
});

const report = (overrides: Partial<ReportRow> = {}): ReportRow => ({
  id: crypto.randomUUID(),
  subjectEntityId: "00000000-0000-0000-0000-000000000001",
  userId: null,
  observedStatus: "stalled",
  answers: {},
  comment: null,
  lat: null,
  lng: null,
  gpsAccuracyM: null,
  photoKeys: [],
  audioKeys: [],
  capturedAt: new Date(),
  submittedAt: new Date(),
  clientUuid: crypto.randomUUID(),
  channel: "pwa",
  corroborationState: "unverified",
  isDemo: false,
  ...overrides,
});

const base = (claims: EnrichedClaim[], reports: ReportRow[] = [], links: { fromClaimId: string; toClaimId: string; relation: string }[] = []) =>
  reconcileSubject({
    subjectEntityId: "00000000-0000-0000-0000-000000000001",
    claims,
    reports,
    links,
    now: new Date("2026-09-21T00:00:00Z"),
  });

describe("reconcileSubject", () => {
  test("always emits a budget verdict, including when budget evidence is absent", () => {
    const result = base([]);
    expect(result.verdicts.find((verdict) => verdict.aspect === "budget")).toMatchObject({ verdict: "unverifiable" });
  });

  test("does not double-count claims from the same finding in payment totals", () => {
    const first = claim({ id: "00000000-0000-0000-0000-000000000011", predicate: "payment_made", valueNumeric: 100 });
    const duplicate = claim({ id: "00000000-0000-0000-0000-000000000012", predicate: "payment_made", valueNumeric: 100 });
    const result = base([first, duplicate], [], [{ fromClaimId: first.id, toClaimId: duplicate.id, relation: "same_finding" }]);
    expect(result.verdicts.find((verdict) => verdict.aspect === "payments")?.summary).toContain("KSh 100");
  });

  test("does not treat two claims from one source as independent award findings", () => {
    const award = claim({ id: "00000000-0000-0000-0000-000000000021", predicate: "contract_awarded_to" });
    const value = claim({ id: "00000000-0000-0000-0000-000000000022", predicate: "contract_value", valueNumeric: 80000000 });
    const result = base([award, value]);
    expect(result.verdicts.find((verdict) => verdict.aspect === "award")).toMatchObject({ verdict: "partially_corroborated" });
  });

  test("marks official completion and a stalled observation as contradicted", () => {
    const completion = claim({ id: "00000000-0000-0000-0000-000000000031", predicate: "completion_claimed", sourceId: "source-official" });
    const observation = claim({
      id: "00000000-0000-0000-0000-000000000032",
      predicate: "observed_status",
      valueStatus: "stalled",
      sourceId: null,
      fieldReportId: "00000000-0000-0000-0000-000000000099",
      sourceType: null,
      trustTier: null,
    });
    const result = base([completion, observation], [report({ id: observation.fieldReportId! })]);
    expect(result.verdicts.find((verdict) => verdict.aspect === "delivery")).toMatchObject({ verdict: "contradicted" });
  });
});
