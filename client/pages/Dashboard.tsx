import { useMemo } from "react";
import { useReports } from "@/store/reports";
import { CityMap } from "@/components/map/CityMap";

export default function Dashboard() {
  const { reports } = useReports();
  const cells = useMemo(() => clusterByCell(reports), [reports]);

  return (
    <div className="h-[calc(100dvh-112px)] md:h-[calc(100dvh-128px)] -mx-4 sm:mx-0">
      <div className="relative h-full">
        <CityMap reports={reports} className="absolute inset-0" />

        <div className="absolute left-4 right-4 bottom-4 sm:left-auto sm:right-4 sm:w-80">
          <div className="rounded-xl bg-background/90 backdrop-blur border shadow-sm p-3">
            <div className="text-sm font-semibold mb-2">Priority areas</div>
            {cells.length === 0 ? (
              <div className="text-xs text-muted-foreground">No reports yet. Submit one to see hotspots.</div>
            ) : (
              <ul className="space-y-2">
                {cells.slice(0, 4).map((c, i) => (
                  <li key={`${c.lat}-${c.lng}`} className="flex items-center justify-between text-xs">
                    <span className="truncate">Lat {c.lat.toFixed(2)}, Lng {c.lng.toFixed(2)}</span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" /> {c.count} reports
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import type { ReportDTO } from "@shared/api";
function clusterByCell(reports: ReportDTO[]) {
  const map = new Map<string, { lat: number; lng: number; count: number }>();
  for (const r of reports) {
    if (!r.location) continue;
    const lat = roundTo(r.location.lat, 2);
    const lng = roundTo(r.location.lng, 2);
    const key = `${lat}|${lng}`;
    if (!map.has(key)) map.set(key, { lat, lng, count: 0 });
    map.get(key)!.count += 1;
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}
function roundTo(n: number, d: number) {
  const p = Math.pow(10, d);
  return Math.round(n * p) / p;
}
