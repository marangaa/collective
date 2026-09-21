import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { CaseMap } from "@/components/case/case-map";
import { EvidenceLanes } from "@/components/case/evidence-lanes";
import { EvidenceRequests } from "@/components/case/evidence-requests";
import { NextSteps } from "@/components/case/next-steps";
import { ReportList } from "@/components/case/reports";
import { VerdictStrip } from "@/components/case/verdict-strip";
import { fmtDate, kes, VERDICT_META, type VerdictValue } from "@/lib/format";
import {
  deliverReport,
  enqueueReport,
  getCurrentLocation,
  removeReport,
  requestReportSync,
  toDataUrl,
  type ReportLocation,
  type ReportOutboxEntry,
} from "@/utils/outbox";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/case/$slug")({
  component: CaseFilePage,
});

const STATUS_OPTIONS = [
  { value: "operational", label: "Open and working", desc: "People are using the facility" },
  { value: "partially_built", label: "Partly built", desc: "The building is not finished" },
  { value: "stalled", label: "Work stopped", desc: "Construction has stopped or the site is locked" },
  { value: "abandoned", label: "Abandoned", desc: "The site is overgrown or left unused" },
  { value: "not_started", label: "Not started", desc: "Nothing has been built yet" },
] as const;

function CaseFilePage() {
  const { slug } = Route.useParams();
  const queryClient = useQueryClient();
  const caseFile = useQuery(trpc.audit.caseFile.queryOptions({ slug }));

  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [expandedSection, setExpandedSection] = useState<"none" | "narrative" | "evidence" | "checks" | "action" | "reports" | "requests">("none");
  const [isCasePanelOpen, setIsCasePanelOpen] = useState(true);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportStatus, setReportStatus] = useState<(typeof STATUS_OPTIONS)[number]["value"] | null>(null);
  const [reportComment, setReportComment] = useState("");
  const [reportPhoto, setReportPhoto] = useState<{ dataUrl: string; mime: string; extension: string } | null>(null);
  const [reportLocation, setReportLocation] = useState<ReportLocation | null>(null);
  const [locationState, setLocationState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportQueued, setReportQueued] = useState(false);

  async function addReportLocation() {
    setLocationState("loading");
    setLocationError(null);
    try {
      setReportLocation(await getCurrentLocation());
      setLocationState("ready");
    } catch (error) {
      setLocationState("error");
      setLocationError(error instanceof Error ? error.message : "We could not get your location.");
    }
  }

  function closeReportModal() {
    if (submitReport.isPending) return;
    setIsReportModalOpen(false);
    setReportStatus(null);
    setReportComment("");
    setReportPhoto(null);
    setReportLocation(null);
    setLocationState("idle");
    setLocationError(null);
  }

  const submitReport = useMutation({
    mutationFn: async ({
      projectId,
      observedStatus,
      comment,
      location,
      photo,
    }: {
      projectId: string;
      observedStatus: ReportOutboxEntry["observedStatus"];
      comment: string;
      location: ReportLocation | null;
      photo: { dataUrl: string; mime: string; extension: string } | null;
    }) => {
      const entry: ReportOutboxEntry = {
        clientUuid: crypto.randomUUID(),
        projectId,
        observedStatus,
        comment: comment.trim() || undefined,
        lat: location?.lat,
        lng: location?.lng,
        gpsAccuracyM: location?.accuracy,
        capturedAt: new Date().toISOString(),
        photoDataUrl: photo?.dataUrl,
        photoMime: photo?.mime,
        photoExtension: photo?.extension,
        createdAt: new Date().toISOString(),
      };
      await enqueueReport(entry);
      await requestReportSync();
      try {
        const result = await deliverReport(entry);
        await removeReport(entry.clientUuid);
        return { ...result, queued: false };
      } catch {
        return { corroborated: false, queued: true };
      }
    },
    onSuccess: (result) => {
      setReportQueued(result.queued);
      setReportSuccess(true);
      queryClient.invalidateQueries({ queryKey: trpc.audit.caseFile.queryKey({ slug }) });
      setTimeout(() => {
        setIsReportModalOpen(false);
        setReportSuccess(false);
        setReportQueued(false);
        setReportStatus(null);
        setReportComment("");
        setReportPhoto(null);
        setReportLocation(null);
        setLocationState("idle");
        setLocationError(null);
      }, 1400);
    },
  });

  // Active project resolution
  const { case: c, projects } = caseFile.data ?? { case: null, projects: [] };
  const current = projects.find((p) => p.id === activeProjectId) ?? projects[0];

  // Chronological timeline steps for the active project
  const timelineSteps = useMemo(() => {
    if (!current) return [];

    // Sort claims chronologically
    const sortedClaims = [...current.claims].sort((a, b) => {
      const da = a.eventDate ?? a.document.publishedAt ?? "";
      const db = b.eventDate ?? b.document.publishedAt ?? "";
      return da.localeCompare(db);
    });

    return sortedClaims.map((claim, idx) => {
      const span = (claim.span ?? {}) as { page?: number | null; excerpt?: string };
      return {
        id: claim.id,
        stepNumber: idx + 1,
        date: claim.eventDate ?? claim.document.publishedAt,
        stage: claim.stage,
        assertion: claim.assertion,
        amountKes: claim.amountKes,
        excerpt: span.excerpt,
        page: span.page,
        docTitle: claim.document.title,
        docUrl: claim.document.url,
        sourceName: claim.source.name,
      };
    });
  }, [current]);

  // Reset step index when project changes
  const handleSelectProject = (id: string) => {
    setActiveProjectId(id);
    setCurrentStepIndex(0);
    setExpandedSection("none");
  };

  if (caseFile.isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black font-mono text-xs text-neutral-400">
        <div className="border border-neutral-800 bg-neutral-950 px-6 py-4">
          <p>Loading the case file…</p>
        </div>
      </div>
    );
  }

  if (caseFile.error || !caseFile.data || !current) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black font-mono text-xs text-neutral-400">
        <div className="max-w-lg border border-neutral-800 bg-neutral-950 p-6">
          <p className="font-semibold text-white">We could not load this case file</p>
          <p className="mt-3 text-neutral-500">
            The public record service could not be reached. Please retry when the connection is restored.
          </p>
          {caseFile.error && <p className="mt-3 wrap-break-word border-t border-neutral-900 pt-3 text-red-400">{caseFile.error.message}</p>}
          <button type="button" onClick={() => void caseFile.refetch()} className="mt-4 border border-white px-3 py-1 text-white hover:bg-white hover:text-black">
            Retry
          </button>
          <a href="/" className="ml-4 underline">Return to home</a>
        </div>
      </div>
    );
  }

  const deliveryVerdict = current.verdicts.find((v) => v.aspect === "delivery")?.verdict;
  const deliveryMeta = VERDICT_META[(deliveryVerdict ?? "unverifiable") as VerdictValue] ?? VERDICT_META.unverifiable;
  const paymentsVerdict = current.verdicts.find((v) => v.aspect === "payments");

  const totalSteps = timelineSteps.length;
  const activeStep = timelineSteps[currentStepIndex] ?? timelineSteps[0];

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black font-sans text-neutral-100 select-none">
      {/* Map */}
      <CaseMap
        projects={projects.map((p) => ({
          id: p.id,
          name: p.name,
          lat: p.lat,
          lng: p.lng,
          deliveryVerdict: p.verdicts.find((v) => v.aspect === "delivery")?.verdict,
          amountKes: p.claims.find((cl) => cl.amountKes != null)?.amountKes,
        }))}
        activeProjectId={current.id}
        onSelectProject={handleSelectProject}
      />

      {/* Header */}
      <header className="pointer-events-none fixed inset-x-3 top-3 z-20 md:inset-x-6">
        <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-3 border border-neutral-800 bg-black/95 px-3 py-2.5 backdrop-blur-md sm:px-4">
          {/* Identity */}
          <div className="flex items-center gap-3">
            <span className="border border-white bg-white px-2 py-0.5 font-mono text-xs font-bold uppercase tracking-wider text-black">
              collective
            </span>
            <div className="flex flex-col font-mono">
              <span className="text-xs font-semibold tracking-tight text-white">
                Nairobi health facilities
              </span>
              <span className="text-[10px] text-neutral-400">
                What official records say, and what people see
              </span>
            </div>
          </div>

          {/* Project Switcher Tabs */}
          <div className="order-3 flex w-full min-w-0 items-center gap-1 overflow-x-auto font-mono text-xs sm:order-none sm:w-auto">
            {projects.map((p, idx) => {
              const isSel = p.id === current.id;
              const pVerdict = p.verdicts.find((v) => v.aspect === "delivery")?.verdict;
              const pMeta = VERDICT_META[(pVerdict ?? "unverifiable") as VerdictValue] ?? VERDICT_META.unverifiable;
              const short = p.name
                .replace("Construction of ", "")
                .replace("Pumwani ", "")
                .replace("Health Centre", "")
                .replace("Dispensary", "")
                .trim();

              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectProject(p.id)}
                  className={`flex shrink-0 items-center gap-1.5 border px-2.5 py-1 transition-colors ${
                    isSel
                      ? "border-white bg-neutral-900 text-white font-bold"
                      : "border-neutral-800 bg-black text-neutral-400 hover:border-neutral-700 hover:text-white"
                  }`}
                >
                  <span className="opacity-40">0{idx + 1}</span>
                  <span>{short}</span>
                  <span className="h-1.5 w-1.5" style={{ backgroundColor: pMeta.dot }} />
                </button>
              );
            })}
          </div>


        </div>
      </header>

      {/* Edge controls */}
      <div className="fixed bottom-3 left-1/2 z-40 flex -translate-x-1/2 gap-1 border border-neutral-800 bg-black/95 p-1 shadow-xl backdrop-blur-md md:bottom-auto md:left-auto md:right-0 md:top-1/2 md:block md:translate-x-0 md:-translate-y-1/2 md:border-r-0 md:p-1">
        <button
          type="button"
          onClick={() => setIsCasePanelOpen((open) => !open)}
          aria-expanded={isCasePanelOpen}
          className={`min-w-24 border px-3 py-2 text-xs transition-colors md:block md:min-w-0 md:[writing-mode:vertical-rl] ${
            isCasePanelOpen
              ? "border-white bg-white text-black"
              : "border-neutral-700 text-neutral-300 hover:border-white hover:text-white"
          }`}
        >
          {isCasePanelOpen ? "Hide case" : "Case details"}
        </button>
        <button
          type="button"
          onClick={() => setIsReportModalOpen(true)}
          aria-expanded={isReportModalOpen}
          className={`min-w-24 border px-3 py-2 text-xs transition-colors md:mt-1 md:block md:min-w-0 md:[writing-mode:vertical-rl] ${
            isReportModalOpen
              ? "border-emerald-400 bg-emerald-400 text-black"
              : "border-neutral-700 text-neutral-300 hover:border-white hover:text-white"
          }`}
        >
          Add observation
        </button>
      </div>

      {/* Case details */}
      {isCasePanelOpen && (
      <section className="fixed inset-x-2 bottom-2 z-30 mx-auto max-w-4xl md:inset-x-6">
        <div className="border border-neutral-800 bg-black/95 backdrop-blur-2xl text-neutral-100 shadow-2xl">
          {/* Deck Header: Active Site & One-Line Truth */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-900 bg-neutral-950 px-4 py-2.5">
            <div className="flex items-center gap-2.5 font-mono text-xs">
              <span className="border border-neutral-700 bg-black px-1.5 py-0.5 text-[10px] font-semibold text-neutral-300">
                {current.ward ?? "Nairobi"}, {current.subCounty ?? "Eastlands"}
              </span>
              <span className="font-semibold text-white">{current.name}</span>
            </div>

            {/* Verdict Signal */}
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="h-2 w-2" style={{ backgroundColor: deliveryMeta.dot }} />
              <span className="font-semibold" style={{ color: deliveryMeta.dot }}>
                {deliveryMeta.label}
              </span>
            </div>
          </div>

          {/* Tension Banner in Plain Human English */}
          <div className="border-b border-neutral-900 bg-black px-4 py-2 text-xs text-neutral-300">
            <span className="mr-2 text-[10px] font-semibold text-red-400">
              Current picture:
            </span>
            <span className="text-white font-medium">
              {paymentsVerdict?.summary ? `${paymentsVerdict.summary}. ` : ""}
              {current.verdicts.find((v) => v.aspect === "delivery")?.summary ?? "Audit confirms project stalled."}
            </span>
          </div>

          {/* The Step-by-Step Timeline Stepper */}
          {activeStep && (
            <div className="p-4 bg-neutral-950/40">
              {/* Step Navigation Bar */}
              <div className="flex items-center justify-between border-b border-neutral-900 pb-2 mb-3 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-400">
                    Timeline
                  </span>
                  <span className="border border-neutral-800 bg-neutral-900 px-1.5 py-0.5 text-white font-semibold text-[10px]">
                    Step {currentStepIndex + 1} of {totalSteps}
                  </span>
                </div>

                {/* Step Navigation Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    disabled={currentStepIndex === 0}
                    onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
                    className="border border-neutral-800 bg-black px-2.5 py-0.5 text-[11px] text-neutral-300 hover:border-neutral-600 hover:text-white disabled:opacity-30 transition-colors"
                  >
                    ← Previous
                  </button>

                  {/* Step Pills */}
                  <div className="hidden sm:flex items-center gap-1 mx-1">
                    {timelineSteps.map((step, sIdx) => (
                      <button
                        key={step.id}
                        onClick={() => setCurrentStepIndex(sIdx)}
                        className={`h-5 w-6 text-[10px] font-mono border transition-colors ${
                          sIdx === currentStepIndex
                            ? "border-white bg-white text-black font-bold"
                            : "border-neutral-800 bg-black text-neutral-500 hover:text-white"
                        }`}
                      >
                        0{sIdx + 1}
                      </button>
                    ))}
                  </div>

                  <button
                    disabled={currentStepIndex >= totalSteps - 1}
                    onClick={() => setCurrentStepIndex((prev) => Math.min(totalSteps - 1, prev + 1))}
                    className="border border-neutral-800 bg-black px-2.5 py-0.5 text-[11px] text-neutral-300 hover:border-neutral-600 hover:text-white disabled:opacity-30 transition-colors"
                  >
                    Next →
                  </button>
                </div>
              </div>

              {/* Single Focused Step Card */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-baseline gap-2 font-mono text-xs">
                  <time className="font-bold text-white text-sm">{fmtDate(activeStep.date)}</time>
                  <span className="border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-[10px] text-neutral-400">
                    {activeStep.stage}
                  </span>
                  {activeStep.amountKes != null && (
                    <span className="font-semibold text-white bg-neutral-900 px-2 py-0.5 border border-neutral-800">
                      {kes(activeStep.amountKes)}
                    </span>
                  )}
                </div>

                <p className="text-sm font-medium leading-snug text-neutral-100">
                  {activeStep.assertion}
                </p>

                {activeStep.excerpt && (
                  <blockquote className="border-l-2 border-neutral-700 bg-neutral-950 px-3 py-1.5 font-mono text-xs text-neutral-300">
                    “{activeStep.excerpt}”
                    {activeStep.page != null && (
                      <span className="ml-2 text-[10px] text-neutral-400">— Page {activeStep.page}</span>
                    )}
                  </blockquote>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[10px] text-neutral-400">
                  <span className="text-neutral-300">{activeStep.sourceName}</span>
                  <span className="opacity-30">/</span>
                  <a
                    href={activeStep.docUrl ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-neutral-300 hover:text-white"
                  >
                    {activeStep.docTitle}
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Collapsible Deep-Dive Drawers */}
          <div className="overflow-x-auto border-t border-neutral-900 bg-black px-3 py-2 font-mono text-[10px] sm:px-4">
            <div className="flex min-w-max items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setExpandedSection((prev) => (prev === "narrative" ? "none" : "narrative"))
                }
                className={`border px-2 py-1 transition-colors ${
                  expandedSection === "narrative"
                    ? "border-white bg-white text-black font-bold"
                    : "border-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                {expandedSection === "narrative" ? "− Hide summary" : "+ Read the summary"}
              </button>

              <button
                onClick={() =>
                  setExpandedSection((prev) => (prev === "evidence" ? "none" : "evidence"))
                }
                className={`border px-2 py-1 transition-colors ${
                  expandedSection === "evidence"
                    ? "border-white bg-white text-black font-bold"
                    : "border-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                {expandedSection === "evidence" ? "− Hide sources" : "+ See the sources"}
              </button>

              <button
                onClick={() =>
                  setExpandedSection((prev) => (prev === "checks" ? "none" : "checks"))
                }
                className={`border px-2 py-1 transition-colors ${
                  expandedSection === "checks"
                    ? "border-white bg-white text-black font-bold"
                    : "border-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                {expandedSection === "checks" ? "− Hide checks" : "+ See the checks"}
              </button>

              <button
                onClick={() =>
                  setExpandedSection((prev) => (prev === "action" ? "none" : "action"))
                }
                className={`border px-2 py-1 transition-colors ${
                  expandedSection === "action"
                    ? "border-white bg-white text-black font-bold"
                    : "border-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                {expandedSection === "action" ? "− Hide next steps" : "+ See next steps"}
              </button>

              <button
                onClick={() =>
                  setExpandedSection((prev) => (prev === "reports" ? "none" : "reports"))
                }
                className={`border px-2 py-1 transition-colors ${
                  expandedSection === "reports"
                    ? "border-white bg-white text-black font-bold"
                    : "border-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                {expandedSection === "reports" ? "− Hide observations" : "+ See observations"}
              </button>

              <button
                onClick={() =>
                  setExpandedSection((prev) => (prev === "requests" ? "none" : "requests"))
                }
                className={`border px-2 py-1 transition-colors ${
                  expandedSection === "requests"
                    ? "border-white bg-white text-black font-bold"
                    : "border-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                {expandedSection === "requests" ? "− Hide open questions" : "+ Open questions"}
              </button>
            </div>
            </div>
          </div>

          {/* Expanded Drawer Content (Only visible if explicitly toggled) */}
          {expandedSection !== "none" && (
            <div className="max-h-[min(22rem,45dvh)] overflow-y-auto border-t border-neutral-900 bg-neutral-950 p-4">
              {expandedSection === "narrative" && (
                <div className="space-y-3">
                  <div>
                    <div className="text-[10px] text-neutral-400">
                      A short summary of the evidence
                    </div>
                    <h3 className="mt-1 text-sm font-semibold text-white">{current.narrative.headline}</h3>
                  </div>
                  <div className="space-y-2 text-xs leading-relaxed text-neutral-300">
                    {current.narrative.paragraphs.map((paragraph: string) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                  <p className="border-t border-neutral-900 pt-2 font-mono text-[10px] text-neutral-500">
                    Basis: {current.narrative.basisClaimIds.length} approved claim(s). Inspect the chronology and evidence cards to trace the record.
                  </p>
                </div>
              )}

              {expandedSection === "evidence" && (
                <EvidenceLanes claims={current.claims} links={current.links} verdicts={current.verdicts} />
              )}

              {expandedSection === "checks" && (
                <div>
                  <div className="mb-2 text-[10px] text-neutral-400">
                    What the record shows about {current.name}
                  </div>
                  <VerdictStrip verdicts={current.verdicts} />
                </div>
              )}

              {expandedSection === "action" && (
                <div>
                  <div className="mb-2 text-[10px] text-neutral-400">
                    A request you can send
                  </div>
                  <NextSteps steps={current.nextSteps} />
                </div>
              )}

              {expandedSection === "reports" && (
                <div>
                  <div className="mb-2 text-[10px] text-neutral-400">
                    What people have seen
                  </div>
                  <ReportList reports={current.reports} />
                </div>
              )}

              {expandedSection === "requests" && (
                <div>
                  <div className="mb-2 text-[10px] text-neutral-400">
                    What we still need to learn
                  </div>
                  <EvidenceRequests requests={current.evidenceRequests} />
                </div>
              )}
            </div>
          )}
        </div>
      </section>
      )}

      {/* Observation form */}
      {isReportModalOpen && (
        <div
          className="pointer-events-none fixed inset-0 z-50 bg-transparent"
          role="presentation"
          onClick={closeReportModal}
        >
          <div
            className="pointer-events-auto absolute bottom-0 left-0 max-h-[75dvh] w-full overflow-y-auto border border-neutral-700 bg-black p-4 shadow-2xl md:bottom-3 md:left-auto md:right-3 md:top-20 md:max-h-none md:w-[min(24rem,calc(100vw-5rem))] md:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <span className="text-[11px] text-neutral-400">
                  Add an observation
                </span>
                <h2 className="mt-0.5 text-sm font-semibold text-white">
                  {current.name}
                </h2>
              </div>
              <button
                onClick={closeReportModal}
                className="text-xs text-neutral-400 underline underline-offset-4 hover:text-white"
              >
                Close
              </button>
            </div>

            {reportSuccess ? (
              <div className="py-8 text-center">
                <div className="text-emerald-400 text-2xl font-bold">✓ {reportQueued ? "Saved for later" : "Saved"}</div>
                <p className="mt-2 text-xs text-neutral-300">
                  {reportQueued
                    ? "Saved on this device. It will retry when the connection returns."
                    : "Your ground observation has been logged into the public record."}
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <p className="text-xs leading-relaxed text-neutral-300">
                  Tell us what you saw at this site. You do not need an account.
                </p>

                <div className="grid gap-1.5">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setReportStatus(opt.value)}
                      className={`flex flex-col text-left p-2.5 border transition-colors ${
                        reportStatus === opt.value
                          ? "border-white bg-neutral-900 text-white"
                          : "border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700"
                      }`}
                    >
                      <span className="font-mono text-xs font-semibold">{opt.label}</span>
                      <span className="text-[11px] text-neutral-400 mt-0.5">{opt.desc}</span>
                    </button>
                  ))}
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-neutral-300">
                    Add a note <span className="font-normal text-neutral-500">(optional)</span>
                  </label>
                  <textarea
                    value={reportComment}
                    onChange={(e) => setReportComment(e.target.value)}
                    maxLength={500}
                    placeholder="For example: the gate was locked and the building was unfinished."
                    className="w-full border border-neutral-800 bg-neutral-950 p-2.5 text-xs text-neutral-200 placeholder:text-neutral-600 focus:border-white focus:outline-none"
                    rows={3}
                  />
                </div>

                <div className="border-t border-neutral-900 pt-3">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="mb-1 text-[11px] font-medium text-neutral-300">Add a photo <span className="font-normal text-neutral-500">(optional)</span></div>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          const dataUrl = await toDataUrl(file);
                          setReportPhoto({ dataUrl, mime: "image/jpeg", extension: "jpg" });
                        }}
                        className="block w-full border border-neutral-800 bg-neutral-950 p-2 text-[11px] text-neutral-400 file:mr-2 file:border-0 file:bg-white file:px-2 file:py-1 file:text-[10px] file:text-black"
                      />
                      <p className="mt-1 text-[10px] text-neutral-500">We remove hidden photo location data before upload.</p>
                    </div>
                    <div>
                      <div className="mb-1 text-[11px] font-medium text-neutral-300">Add your location <span className="font-normal text-neutral-500">(optional)</span></div>
                      <button
                        type="button"
                        onClick={() => void addReportLocation()}
                        disabled={locationState === "loading"}
                        className="w-full border border-neutral-700 px-3 py-2 text-left text-[11px] text-neutral-200 hover:border-white disabled:opacity-50"
                      >
                        {locationState === "loading" ? "Getting location…" : locationState === "ready" ? "Location added — update" : "Use my location"}
                      </button>
                      {locationState === "ready" && reportLocation && (
                        <p className="mt-1 text-[10px] text-emerald-400">Accurate to about {reportLocation.accuracy} metres.</p>
                      )}
                      {locationError && <p className="mt-1 text-[10px] text-amber-400">{locationError}</p>}
                    </div>
                  </div>

                  <div className="sticky bottom-0 -mx-4 mt-4 flex items-center justify-between gap-3 border-t border-neutral-900 bg-black px-4 pt-3 sm:-mx-5 sm:px-5">
                    <span className="text-[10px] text-neutral-500">Your report can be sent later if you are offline.</span>
                  <button
                    disabled={!reportStatus || submitReport.isPending}
                    onClick={() => {
                      if (reportStatus) {
                        submitReport.mutate({
                          projectId: current.id,
                          observedStatus: reportStatus,
                          comment: reportComment,
                          location: reportLocation,
                          photo: reportPhoto,
                        });
                      }
                    }}
                    className="shrink-0 border border-white bg-white px-4 py-2.5 text-xs font-semibold text-black hover:bg-neutral-200 disabled:opacity-40 transition-colors"
                  >
                    {submitReport.isPending ? "Saving…" : "Save observation"}
                  </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
