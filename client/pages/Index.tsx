import { useMemo } from "react";
import { ReportForm } from "@/components/report/ReportForm";
import { useReports } from "@/store/reports";
import { CityMap } from "@/components/map/CityMap";

export default function Index() {
  const { reports } = useReports();
  const stats = useMemo(() => {
    const total = reports.length;
    const resolved = reports.filter((r) => r.status === "resolved").length;
    const active = total - resolved;
    return { total, resolved, active };
  }, [reports]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-5 bg-gradient-to-br from-emerald-50 to-cyan-50 border">
        <div className="text-xl font-extrabold tracking-tight">
          Report city issues in seconds
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Snap a photo, add a note or voice message, and we\'ll tag your
          location automatically.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="Total" value={stats.total} />
          <Stat label="Active" value={stats.active} />
          <Stat label="Resolved" value={stats.resolved} />
        </div>
      </div>

      <ReportForm />

      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold">Live city map</div>
          <a href="/dashboard" className="text-xs text-primary hover:underline">
            Open full map
          </a>
        </div>
        <div className="h-64 overflow-hidden rounded-xl border">
          <CityMap reports={reports} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-background border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
