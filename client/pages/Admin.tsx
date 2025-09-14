import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listReports, updateReport } from "@/lib/api";
import type { ReportDTO, ReportStatus, ReportCategory, ReportUrgency } from "@shared/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function Admin() {
  const exportCsv = (rows: ReportDTO[]) => {
    const flat = rows.map((r) => ({ id: r.id, createdAt: new Date(r.createdAt).toISOString(), status: r.status, category: r.category, urgency: r.urgency, department: r.department, assignee: r.assignee ?? "", description: r.description.replace(/\n/g, " ") }));
    const header = Object.keys(flat[0] ?? { id: "id" });
    const lines = [header.join(","), ...flat.map((row) => header.map((h) => JSON.stringify((row as any)[h] ?? "")).join(","))];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `reports-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ReportStatus | "">("");
  const [category, setCategory] = useState<ReportCategory | "">("");
  const [urgency, setUrgency] = useState<ReportUrgency | "">("");
  const [department, setDepartment] = useState<string | "">("");
  const [centerLat, setCenterLat] = useState<string>("");
  const [centerLng, setCenterLng] = useState<string>("");
  const [radiusKm, setRadiusKm] = useState<string>("");
  const [hasLocation, setHasLocation] = useState<string>("");

  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["admin-reports", { q, status, category, urgency, department, centerLat, centerLng, radiusKm, hasLocation }],
    queryFn: () => listReports({
      q: q || undefined,
      status: (status as any) || undefined,
      category: (category as any) || undefined,
      urgency: (urgency as any) || undefined,
      department: department || undefined,
      centerLat: centerLat ? Number(centerLat) : undefined,
      centerLng: centerLng ? Number(centerLng) : undefined,
      radiusKm: radiusKm ? Number(radiusKm) : undefined,
      hasLocation: hasLocation ? hasLocation === "true" : undefined,
    }),
    select: (d) => d.sort((a, b) => b.createdAt - a.createdAt),
  });

  const analytics = useQuery({ queryKey: ["analytics"], queryFn: () => import("@/lib/api").then(m => m.getAnalytics()) });

  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ReportDTO> }) => updateReport(id, patch as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-reports"] }),
  });

  const depts = useMemo(() => ["Public Works", "Transportation", "Community Services", "Utilities", "General Services"], []);

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4 bg-card border space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold">Admin Portal</div>
          <div className="text-xs text-muted-foreground">Manage and route reports</div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border p-3 bg-background">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="text-lg font-semibold">{analytics.data?.totals.total ?? 0}</div>
          </div>
          <div className="rounded-lg border p-3 bg-background">
            <div className="text-xs text-muted-foreground">Active</div>
            <div className="text-lg font-semibold">{analytics.data?.totals.active ?? 0}</div>
          </div>
          <div className="rounded-lg border p-3 bg-background">
            <div className="text-xs text-muted-foreground">Resolved</div>
            <div className="text-lg font-semibold">{analytics.data?.totals.resolved ?? 0}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Input placeholder="Search text..." value={q} onChange={(e) => setQ(e.target.value)} />
          <Select value={status} onValueChange={(v) => setStatus(v === "__any" ? "" : (v as any))}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__any">Any status</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="acknowledged">Acknowledged</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={(v) => setCategory(v === "__any" ? "" : (v as any))}>
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__any">Any category</SelectItem>
              <SelectItem value="pothole">Pothole</SelectItem>
              <SelectItem value="streetlight">Streetlight</SelectItem>
              <SelectItem value="trash">Trash</SelectItem>
              <SelectItem value="graffiti">Graffiti</SelectItem>
              <SelectItem value="water">Water</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Select value={urgency} onValueChange={(v) => setUrgency(v === "__any" ? "" : (v as any))}>
            <SelectTrigger><SelectValue placeholder="Urgency" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__any">Any urgency</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
          <Select value={department} onValueChange={(v) => setDepartment(v === "__any" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__any">Any department</SelectItem>
              {depts.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="Lat" value={centerLat} onChange={(e) => setCenterLat(e.target.value)} />
            <Input placeholder="Lng" value={centerLng} onChange={(e) => setCenterLng(e.target.value)} />
            <Input placeholder="Radius km" value={radiusKm} onChange={(e) => setRadiusKm(e.target.value)} />
          </div>
          <Select value={hasLocation} onValueChange={(v) => setHasLocation(v === "__any" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Has location" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__any">All</SelectItem>
              <SelectItem value="true">With location</SelectItem>
              <SelectItem value="false">Without location</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-end">
          <Button variant="secondary" onClick={() => exportCsv(query.data ?? [])}>Export CSV</Button>
        </div>
      </div>

      <div className="rounded-xl p-4 bg-card border">
        <div className="text-sm font-semibold mb-2">Trends</div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={analytics.data?.dailyCounts ?? []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-2">Reported</th>
              <th className="text-left p-2">Details</th>
              <th className="text-left p-2">Category</th>
              <th className="text-left p-2">Urgency</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Department</th>
              <th className="text-left p-2">Assignee</th>
            </tr>
          </thead>
          <tbody>
            {(query.data ?? []).map((r) => (
              <tr key={r.id} className="border-t align-top">
                <td className="p-2 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                <td className="p-2">
                  <div className="text-xs text-muted-foreground mb-1">{r.id}</div>
                  <div className="text-sm">{r.description || "No description"}</div>
                  {r.photoUrl ? <img src={r.photoUrl} alt="photo" className="mt-2 h-16 w-auto rounded border" /> : null}
                </td>
                <td className="p-2 capitalize">{r.category}</td>
                <td className="p-2">
                  <span className={badgeClass(r.urgency)}>{r.urgency}</span>
                </td>
                <td className="p-2">
                  <Select value={r.status} onValueChange={(v) => updateMut.mutate({ id: r.id, patch: { status: v as ReportStatus } })}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="acknowledged">Acknowledged</SelectItem>
                      <SelectItem value="in_progress">In progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-2">
                  <Select value={r.department} onValueChange={(v) => updateMut.mutate({ id: r.id, patch: { department: v } })}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {depts.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <Input defaultValue={r.assignee ?? ""} placeholder="Name" onBlur={(e) => updateMut.mutate({ id: r.id, patch: { assignee: e.target.value } })} className="h-8" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function badgeClass(u: ReportUrgency) {
  if (u === "high") return "text-xs px-2 py-1 rounded-full capitalize bg-red-100 text-red-700";
  if (u === "medium") return "text-xs px-2 py-1 rounded-full capitalize bg-amber-100 text-amber-700";
  return "text-xs px-2 py-1 rounded-full capitalize bg-emerald-100 text-emerald-700";
}

function formatDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString();
}
