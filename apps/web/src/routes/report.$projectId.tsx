import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import {
  deliverReport,
  enqueueReport,
  flushReportOutbox,
  getCurrentLocation,
  removeReport,
  requestReportSync,
  toDataUrl,
  type ReportLocation,
  type ReportOutboxEntry,
} from "@/utils/outbox";

export const Route = createFileRoute("/report/$projectId")({
  component: ReportPage,
});

const OPTIONS = [
  { value: "operational", label: "Open and working", desc: "People are using the facility" },
  { value: "partially_built", label: "Partly built", desc: "The building is not finished" },
  { value: "stalled", label: "Work stopped", desc: "Construction has stopped or the site is locked" },
  { value: "abandoned", label: "Abandoned", desc: "The site is overgrown or left unused" },
  { value: "not_started", label: "Not started", desc: "Nothing has been built yet" }
] as const;

function ReportPage() {
  const { projectId } = Route.useParams();
  const [status, setStatus] = useState<(typeof OPTIONS)[number]["value"] | null>(null);
  const [comment, setComment] = useState("");
  const [photo, setPhoto] = useState<{ dataUrl: string; mime: string; extension: string } | null>(null);
  const [location, setLocation] = useState<ReportLocation | null>(null);
  const [locationState, setLocationState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [done, setDone] = useState<null | { corroborated: boolean; queued: boolean }>(null);

  async function addLocation() {
    setLocationState("loading");
    setLocationError(null);
    try {
      setLocation(await getCurrentLocation());
      setLocationState("ready");
    } catch (error) {
      setLocationState("error");
      setLocationError(error instanceof Error ? error.message : "We could not get your location.");
    }
  }

  const submit = useMutation({
    mutationFn: async (observedStatus: ReportOutboxEntry["observedStatus"]) => {
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
        const res = await deliverReport(entry);
        await removeReport(entry.clientUuid);
        void flushReportOutbox();
        return { corroborated: res.corroborated, queued: false };
      } catch {
        return { corroborated: false, queued: true };
      }
    },
    onSuccess: (r) => setDone(r),
  });

  if (done) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black p-4 text-xs">
        <div className="w-full max-w-md border border-neutral-800 bg-neutral-950 p-6 text-center">
          <div className="text-2xl font-bold text-emerald-400">✓ {done.queued ? "Saved for later" : "Saved"}</div>
          <h1 className="mt-3 text-sm font-semibold text-white">
            {done.queued ? "Saved on this device" : "Observation saved"}
          </h1>
          <p className="mt-2 text-neutral-400 leading-relaxed">
            {done.queued
              ? "Connection unreachable. Stored locally and will sync automatically when online."
              : done.corroborated
                ? "Your report confirms existing observations and has updated the site's verification state."
                : "Your report was logged. Independent reports strengthen public accountability for this site."}
          </p>
          <a
            href="/"
            className="mt-6 inline-block border border-white bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-neutral-200 transition-colors"
          >
            Back to the case
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-black p-4 text-neutral-200">
      <div className="w-full max-w-md border border-neutral-800 bg-neutral-950 p-6 text-xs">
        <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
          <span className="text-[10px] text-neutral-400">Add an observation</span>
          <a href="/" className="text-[11px] text-neutral-400 hover:text-white">
            Back to the case
          </a>
        </div>

        <h1 className="mt-4 text-base font-semibold tracking-tight text-white">
          What did you see at this site?
        </h1>
        <p className="mt-1 text-neutral-400 text-[11px]">
          No account is needed. Share only what you are comfortable sharing.
        </p>

        <div className="mt-5 space-y-1.5">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setStatus(o.value)}
              className={`flex w-full flex-col p-3 text-left border transition-colors ${
                status === o.value
                  ? "border-white bg-neutral-900 text-white"
                  : "border-neutral-800 bg-black text-neutral-300 hover:border-neutral-700"
              }`}
            >
              <span className="font-semibold text-xs">{o.label}</span>
              <span className="text-[10px] text-neutral-400 mt-0.5">{o.desc}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 border-y border-neutral-900 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold text-neutral-300">Add your location</p>
              <p className="mt-1 text-[10px] text-neutral-500">Optional. It helps us match your report to this site.</p>
            </div>
            <button
              type="button"
              onClick={() => void addLocation()}
              disabled={locationState === "loading"}
              className="shrink-0 border border-neutral-700 px-3 py-2 text-[10px] text-neutral-200 hover:border-white disabled:opacity-50"
            >
              {locationState === "loading" ? "Getting location…" : locationState === "ready" ? "Update location" : "Use my location"}
            </button>
          </div>
          {locationState === "ready" && location && (
            <p className="mt-2 text-[10px] text-emerald-400">
              Location added, accurate to about {location.accuracy} metres.
            </p>
          )}
          {locationError && <p className="mt-2 text-[10px] text-amber-400">{locationError}</p>}
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-[11px] text-neutral-300">
            Add a photo <span className="text-neutral-500">(optional)</span>
          </label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const dataUrl = await toDataUrl(file);
              setPhoto({ dataUrl, mime: "image/jpeg", extension: "jpg" });
            }}
            className="block w-full border border-neutral-800 bg-black p-2 text-[11px] text-neutral-400 file:mr-3 file:border-0 file:bg-white file:px-2 file:py-1 file:font-mono file:text-[10px] file:uppercase file:text-black"
          />
          <p className="mt-1 text-[10px] text-neutral-500">We remove hidden photo location data before upload.</p>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-[11px] text-neutral-300">
            Add a note <span className="text-neutral-500">(optional)</span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            placeholder="For example: the gate was locked and the building was unfinished."
            className="w-full border border-neutral-800 bg-black p-2.5 text-xs text-neutral-200 placeholder:text-neutral-600 focus:border-white focus:outline-none"
            rows={3}
          />
        </div>

        <button
          disabled={!status || submit.isPending}
          onClick={() => status && submit.mutate(status)}
          className="mt-4 w-full border border-white bg-white py-2.5 text-xs font-semibold text-black hover:bg-neutral-200 disabled:opacity-40 transition-colors"
        >
          {submit.isPending ? "Saving…" : "Save observation"}
        </button>
      </div>
    </div>
  );
}


