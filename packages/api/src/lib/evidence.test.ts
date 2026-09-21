import { describe, expect, test } from "bun:test";

import { computeDimensions } from "./dimensions";
import { generateEvidenceRequests } from "./evidence-requests";

describe("evidence dimensions", () => {
  test("makes firsthand photographed observations direct and verifiable", () => {
    const dimensions = computeDimensions({
      predicate: "observed_status",
      stage: "completion",
      span: { excerpt: "The site was visited and photographed on the observation date." },
      extractionMethod: "manual",
      reviewState: "approved",
      observedAt: "2026-09-20",
      sourceTrustTier: "community",
      sourceType: "citizen_observation",
      fromFieldReport: true,
      hasPhoto: true,
      echoCount: 1,
      conflictCount: 0,
      now: new Date("2026-09-21T00:00:00Z"),
    });
    expect(dimensions.directness.score).toBe(1);
    expect(dimensions.verifiability.score).toBe(0.8);
  });

  test("reduces provenance when a claim has no citable span", () => {
    const dimensions = computeDimensions({
      predicate: "progress_reported",
      stage: "implementation",
      span: {},
      extractionMethod: "llm",
      reviewState: "approved",
      echoCount: 1,
      conflictCount: 0,
    });
    expect(dimensions.provenance.score).toBeLessThanOrEqual(0.5);
    expect(dimensions.provenance.rationale).toContain("no verbatim span");
  });
});

describe("evidence requests", () => {
  test("turns unresolved delivery gaps into concrete asks", () => {
    const requests = generateEvidenceRequests([
      {
        aspect: "delivery",
        verdict: "contradicted",
        summary: "Completion and observation findings conflict.",
        basisClaimIds: ["claim-1", "claim-2"],
        gaps: ["completion_certificate"],
      },
    ], "Kawangware Health Centre");
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ kind: "official_confirmation", priority: 1 });
    expect(requests[0]?.question).toContain("Kawangware Health Centre");
  });
});
