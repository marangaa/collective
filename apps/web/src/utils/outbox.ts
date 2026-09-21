import { ensureAnonymousSession } from "./auth";
import { trpcClient } from "./trpc";

export type ReportStatus =
  | "operational"
  | "partially_built"
  | "stalled"
  | "abandoned"
  | "not_started"
  | "unusable"
  | "unknown";

export type ReportLocation = {
  lat: number;
  lng: number;
  accuracy: number;
};

export type ReportOutboxEntry = {
  clientUuid: string;
  projectId: string;
  observedStatus: ReportStatus;
  comment?: string;
  capturedAt: string;
  lat?: number;
  lng?: number;
  gpsAccuracyM?: number;
  answers?: Record<string, string>;
  photoDataUrl?: string;
  photoMime?: string;
  photoExtension?: string;
  createdAt: string;
};

export function getCurrentLocation(): Promise<ReportLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is not available on this device."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          lat: coords.latitude,
          lng: coords.longitude,
          accuracy: Math.max(1, Math.round(coords.accuracy)),
        }),
      (error) => reject(new Error(error.message || "We could not get your location.")),
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 15_000 },
    );
  });
}

type OutboxDb = IDBDatabase;
const DB_NAME = "collective-outbox";
const STORE = "reports";
const DB_VERSION = 1;

function openDb(): Promise<OutboxDb> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: "clientUuid" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open report outbox"));
  });
}

export async function enqueueReport(entry: ReportOutboxEntry) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE, "readwrite").objectStore(STORE).put(entry);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Could not queue report"));
  });
  db.close();
}

export async function removeReport(clientUuid: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE, "readwrite").objectStore(STORE).delete(clientUuid);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Could not remove queued report"));
  });
  db.close();
}

export async function listQueuedReports(): Promise<ReportOutboxEntry[]> {
  const db = await openDb();
  const entries = await new Promise<ReportOutboxEntry[]>((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result as ReportOutboxEntry[]);
    request.onerror = () => reject(request.error ?? new Error("Could not read report outbox"));
  });
  db.close();
  return entries.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function toDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) return readAsDataUrl(file);
  const bitmap = await createImageBitmap(file);
  const maxDimension = 1600;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) return readAsDataUrl(file);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  // Re-encoding through canvas removes EXIF, including embedded GPS metadata.
  return canvas.toDataURL("image/jpeg", 0.78);
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read photo"));
    reader.readAsDataURL(file);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, body] = dataUrl.split(",");
  if (!header || !body) throw new Error("Invalid queued media");
  const mime = /data:([^;]+);/.exec(header)?.[1] ?? "application/octet-stream";
  const binary = atob(body);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

async function uploadQueuedPhoto(entry: ReportOutboxEntry) {
  if (!entry.photoDataUrl || !entry.photoMime) return undefined;
  const presigned = await trpcClient.report.presignMedia.mutate({
    mime: entry.photoMime,
    extension: entry.photoExtension ?? "jpg",
  });
  if (!presigned.url) {
    throw new Error("Photo storage is not configured yet. Your report will stay saved until it is ready.");
  }
  const response = await fetch(presigned.url, {
    method: "PUT",
    headers: { "Content-Type": entry.photoMime },
    body: dataUrlToBlob(entry.photoDataUrl),
  });
  if (!response.ok) throw new Error(`Photo upload failed (${response.status})`);
  return { key: presigned.key, mime: entry.photoMime };
}

export async function deliverReport(entry: ReportOutboxEntry) {
  await ensureAnonymousSession();
  const uploadedPhoto = await uploadQueuedPhoto(entry);
  return trpcClient.report.submit.mutate({
    clientUuid: entry.clientUuid,
    projectId: entry.projectId,
    observedStatus: entry.observedStatus,
    comment: entry.comment,
    capturedAt: entry.capturedAt,
    lat: entry.lat,
    lng: entry.lng,
    gpsAccuracyM: entry.gpsAccuracyM,
    answers: entry.answers,
    photoKeys: uploadedPhoto ? [uploadedPhoto.key] : undefined,
    photoMetadata: uploadedPhoto ? [uploadedPhoto] : undefined,
  });
}

export async function flushReportOutbox() {
  if (!navigator.onLine) return { sent: 0, remaining: (await listQueuedReports()).length };
  let sent = 0;
  const entries = await listQueuedReports();
  for (const entry of entries) {
    try {
      await deliverReport(entry);
      await removeReport(entry.clientUuid);
      sent += 1;
    } catch {
      // Keep the entry. A later online event/app open/manual retry will retry it.
      break;
    }
  }
  return { sent, remaining: (await listQueuedReports()).length };
}

export async function requestReportSync() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const sync = (registration as ServiceWorkerRegistration & { sync?: { register(tag: string): Promise<void> } }).sync;
    if (sync) await sync.register("collective-report-sync");
    else registration.active?.postMessage({ type: "collective-report-sync" });
  } catch {
    // iOS Safari and private browsing may not expose Background Sync.
  }
}

