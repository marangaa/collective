import { useEffect, useRef, useState } from "react";

import { VERDICT_META, type VerdictValue } from "@/lib/format";

type ProjectPin = {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  deliveryVerdict?: string;
};

const PIN_COLORS: Record<string, string> = {
  corroborated: "#10b981",
  contradicted: "#ef4444",
  unverifiable: "#71717a",
  partially_corroborated: "#f59e0b",
};

/** Case map — MapLibre + OpenFreeMap (free, keyless). Enhancement only:
 *  the case file is fully usable without it (low-bandwidth contract). */
export function CaseMap({ projects }: { projects: ProjectPin[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let map: import("maplibre-gl").Map | undefined;
    let cancelled = false;

    (async () => {
      try {
        const maplibregl = await import("maplibre-gl");
        await import("maplibre-gl/dist/maplibre-gl.css");
        if (cancelled || !ref.current) return;

        const pins = projects.filter((p) => p.lat != null && p.lng != null);
        map = new maplibregl.Map({
          container: ref.current,
          style: "https://tiles.openfreemap.org/styles/positron",
          center: [36.65, -1.295] as [number, number],
          zoom: 10.5,
          attributionControl: {},
        });

        for (const p of pins) {
          const el = document.createElement("div");
          const color = PIN_COLORS[p.deliveryVerdict ?? "unverifiable"] ?? "#71717a";
          el.style.cssText = `width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)`;
          el.title = p.name;
          new maplibregl.Marker({ element: el })
            .setLngLat([p.lng!, p.lat!])
            .setPopup(new maplibregl.Popup({ offset: 12 }).setText(p.name))
            .addTo(map);
        }

        if (pins.length > 1) {
          const bounds = pins.reduce(
            (b, p) => b.extend([p.lng!, p.lat!]),
            new maplibregl.LngLatBounds([pins[0]!.lng!, pins[0]!.lat!], [pins[0]!.lng!, pins[0]!.lat!]),
          );
          map.fitBounds(bounds, { padding: 60, maxZoom: 13 });
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [projects]);

  if (failed) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        Map unavailable (offline or tiles unreachable). The record below is the source of truth.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div ref={ref} className="h-72 w-full rounded-lg border" />
      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        {(Object.keys(VERDICT_META) as VerdictValue[]).map((v) => (
          <span key={v} className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: PIN_COLORS[v] }} />
            {VERDICT_META[v].label}
          </span>
        ))}
      </div>
    </div>
  );
}
