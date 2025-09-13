import React, { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L, { LatLngExpression } from "leaflet";
import type { ReportDTO } from "@shared/api";

// Fix default marker icons in Vite
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIconProto: any = L.Icon.Default.prototype as any;
delete DefaultIconProto._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export interface CityMapProps {
  reports: Report[];
  center?: LatLngExpression;
  zoom?: number;
  className?: string;
}

function urgencyColor(u: Report["urgency"]) {
  switch (u) {
    case "high":
      return "#ef4444"; // red-500
    case "medium":
      return "#f59e0b"; // amber-500
    default:
      return "#10b981"; // emerald-500
  }
}

export const CityMap: React.FC<CityMapProps> = ({ reports, center = [37.7749, -122.4194], zoom = 12, className }) => {
  const cells = useMemo(() => clusterByCell(reports), [reports]);

  // Auto-fit bounds when there are multiple reports
  const bounds = useMemo(() => {
    if (!reports.length) return null;
    const latLngs = reports
      .filter((r) => r.location)
      .map((r) => [r.location!.lat, r.location!.lng] as [number, number]);
    if (!latLngs.length) return null;
    return L.latLngBounds(latLngs);
  }, [reports]);

  return (
    <div className={className}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: "100%", height: "100%", borderRadius: "12px" }}
        bounds={bounds ?? undefined}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {reports.map((r) =>
          r.location ? (
            <Marker key={r.id} position={[r.location.lat, r.location.lng] as LatLngExpression}>
              <Popup>
                <div className="space-y-2">
                  <div className="text-sm font-semibold">{r.description || "No description"}</div>
                  <div className="text-xs text-muted-foreground capitalize">Urgency: {r.urgency.replace("_", " ")}</div>
                  <div className="text-xs">Status: {titleCase(r.status)}</div>
                  {r.photoUrl ? (
                    <img src={r.photoUrl} alt="report" className="mt-2 rounded-md max-h-40 w-auto object-cover" />
                  ) : null}
                  {r.audioUrl ? (
                    <audio controls className="w-full mt-2">
                      <source src={r.audioUrl} />
                    </audio>
                  ) : null}
                </div>
              </Popup>
            </Marker>
          ) : null,
        )}

        {cells.map((c) => (
          <Circle
            key={`${c.lat.toFixed(3)}-${c.lng.toFixed(3)}`}
            center={[c.lat, c.lng] as LatLngExpression}
            radius={Math.min(400 + c.count * 120, 2000)}
            pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: Math.min(0.25 + c.count * 0.07, 0.55) }}
          />
        ))}
      </MapContainer>
    </div>
  );
};

function titleCase(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function clusterByCell(reports: Report[]) {
  const map = new Map<string, { lat: number; lng: number; count: number }>();
  for (const r of reports) {
    if (!r.location) continue;
    const lat = roundTo(r.location.lat, 2);
    const lng = roundTo(r.location.lng, 2);
    const key = `${lat}|${lng}`;
    if (!map.has(key)) map.set(key, { lat, lng, count: 0 });
    map.get(key)!.count += 1;
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 30);
}

function roundTo(n: number, d: number) {
  const p = Math.pow(10, d);
  return Math.round(n * p) / p;
}
