import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listReports, updateReport } from "@/lib/api";
import type { ReportDTO, ReportStatus, ReportCategory, ReportUrgency } from "@shared/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function Admin() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ReportStatus | "">("");
  const [category, setCategory] = useState<ReportCategory | "">("");
  const [urgency, setUrgency] = useState<ReportUrgency | "">("");
  const [department, setDepartment] = useState<string | "">("");

  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["admin-reports", { q, status, category, urgency, department }],
    queryFn: () => listReports({ q: q || undefined, status: (status as any) || undefined, category: (category as any) || undefined, urgency: (urgency as any) || undefined, department: department || undefined }),
    select: (d) => d.sort((a, b) => b.createdAt - a.createdAt),
  });

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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Input placeholder="Search text..." value={q} onChange={(e) => setQ(e.target.value)} />
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any status</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="acknowledged">Acknowledged</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={(v) => setCategory(v as any)}>
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any category</SelectItem>
              <SelectItem value="pothole">Pothole</SelectItem>
              <SelectItem value="streetlight">Streetlight</SelectItem>
              <SelectItem value="trash">Trash</SelectItem>
              <SelectItem value="graffiti">Graffiti</SelectItem>
              <SelectItem value="water">Water</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Select value={urgency} onValueChange={(v) => setUrgency(v as any)}>
            <SelectTrigger><SelectValue placeholder="Urgency" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any urgency</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
          <Select value={department} onValueChange={(v) => setDepartment(v)}>
            <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any department</SelectItem>
              {depts.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
