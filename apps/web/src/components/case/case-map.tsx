import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";

import { VERDICT_META, type VerdictValue } from "@/lib/format";

export type ProjectPin = {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  deliveryVerdict?: string;
  amountKes?: number | null;
  shortName?: string;
};

type CaseMapProps = {
  projects: ProjectPin[];
  activeProjectId: string | null;
  onSelectProject: (id: string) => void;
};

// Keyless OSS vector basemap (OpenFreeMap, OSM data). Drop-in MapLibre style,
// no API key, no quota to watch. Attribution is rendered by MapLibre.
const OPENFREEMAP_DARK_STYLE = "https://tiles.openfreemap.org/styles/dark";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const OVERVIEW_BOUNDS_OPTIONS = {
  padding: { top: 90, bottom: 260, left: 60, right: 60 },
  maxZoom: 13.5,
} as const;

function fitProjectsToOverview(map: maplibregl.Map, projects: ProjectPin[]) {
  const valid = projects.filter((p) => p.lat != null && p.lng != null);
  if (valid.length === 0) return;
  const bounds = valid.reduce(
    (b, p) => b.extend([p.lng!, p.lat!]),
    new maplibregl.LngLatBounds([valid[0]!.lng!, valid[0]!.lat!], [valid[0]!.lng!, valid[0]!.lat!]),
  );
  map.fitBounds(bounds, OVERVIEW_BOUNDS_OPTIONS);
}

export function CaseMap({ projects, activeProjectId, onSelectProject }: CaseMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const [mapReady, setMapReady] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OPENFREEMAP_DARK_STYLE,
      center: [36.874, -1.265], // Center of Eastlands health corridor
      zoom: 12.3,
      attributionControl: { compact: true },
    });

    map.on("load", () => {
      mapRef.current = map;
      setMapReady(true);
      map.resize();
    });

    // Resize observer to handle dynamic layout
    const ro = new ResizeObserver(() => {
      map.resize();
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  // Fit overview once the map is ready and project sites arrive.
  // Skipped while a project is selected so it doesn't yank the camera
  // back from the fly-to effect below.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || activeProjectId) return;
    fitProjectsToOverview(map, projects);
  }, [projects, activeProjectId, mapReady]);

  // Update Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Clear previous markers
    for (const m of markersRef.current.values()) {
      m.remove();
    }
    markersRef.current.clear();

    const valid = projects.filter((p) => p.lat != null && p.lng != null);

    valid.forEach((p, idx) => {
      const isActive = p.id === activeProjectId;
      const verdictKey = (p.deliveryVerdict ?? "unverifiable") as VerdictValue;
      const meta = VERDICT_META[verdictKey] ?? VERDICT_META.unverifiable;

      const el = document.createElement("div");
      el.className = "group cursor-pointer select-none";
      el.style.zIndex = isActive ? "50" : "20";

      const cleanName = escapeHtml(
        p.name
          .replace("Construction of ", "")
          .replace("Pumwani ", "")
          .replace("Health Centre", "")
          .replace("Dispensary", "")
          .trim(),
      );

      el.innerHTML = `
        <div class="flex flex-col items-center">
          <!-- Square Target Reticle -->
          <div class="relative flex items-center justify-center w-6 h-6 bg-black border ${
            isActive ? "border-white ring-2 ring-white/60" : "border-neutral-600 group-hover:border-white"
          } transition-all duration-150">
            <div class="w-2 h-2" style="background-color: ${meta.dot}"></div>
            ${
              isActive
                ? `<div class="absolute -inset-1 border border-white/50 animate-ping pointer-events-none"></div>`
                : ""
            }
          </div>

          <!-- Monospace Site Tag -->
          <div class="mt-1.5 px-2 py-0.5 border ${
            isActive
              ? "border-white bg-white text-black font-bold"
              : "border-neutral-800 bg-black/95 text-neutral-300 group-hover:border-neutral-600 group-hover:text-white"
          } font-mono text-[10px] uppercase tracking-wider whitespace-nowrap shadow-2xl transition-all">
            <span>0${idx + 1} ${cleanName}</span>
            <span class="mx-1 opacity-40">·</span>
            <span style="color: ${isActive ? "#000" : meta.dot}">${meta.label}</span>
          </div>
        </div>
      `;

      el.onclick = () => {
        onSelectProject(p.id);
        map.flyTo({
          center: [p.lng!, p.lat!],
          zoom: 14.5,
          duration: 900,
        });
      };

      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([p.lng!, p.lat!])
        .addTo(map);

      markersRef.current.set(p.id, marker);
    });
  }, [projects, activeProjectId, mapReady, onSelectProject]);

  // Center camera when selected project changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !activeProjectId || !mapReady) return;
    const target = projects.find((p) => p.id === activeProjectId);
    if (target?.lat != null && target?.lng != null) {
      map.flyTo({
        center: [target.lng, target.lat],
        zoom: 14.5,
        duration: 900,
      });
    }
  }, [activeProjectId, projects, mapReady]);

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleFitOverview = () => {
    const map = mapRef.current;
    if (!map) return;
    fitProjectsToOverview(map, projects);
  };

  return (
    <div className="absolute inset-0 h-full w-full bg-black overflow-hidden select-none">
      {/* MapLibre Canvas */}
      <div ref={containerRef} className="h-full w-full" />

      {/* Map Controls */}
      <div className="absolute right-4 top-20 z-20 flex flex-col gap-1 font-mono text-xs">
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="flex h-8 w-8 items-center justify-center border border-neutral-800 bg-black/90 text-neutral-200 hover:border-neutral-500 hover:text-white transition-colors"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="flex h-8 w-8 items-center justify-center border border-neutral-800 bg-black/90 text-neutral-200 hover:border-neutral-500 hover:text-white transition-colors"
        >
          −
        </button>
        <button
          onClick={handleFitOverview}
          title="Overview of All Sites"
          className="flex h-8 px-2 items-center justify-center border border-neutral-800 bg-black/90 text-[10px] text-neutral-200 hover:border-neutral-500 hover:text-white transition-colors uppercase tracking-wider"
        >
          OVERVIEW
        </button>
      </div>
    </div>
  );
}
