import type { AnalyticsResponse, CreateReportRequest, ReportDTO, ReportsQuery, UpdateReportRequest } from "@shared/api";

export async function listReports(params: ReportsQuery = {}): Promise<ReportDTO[]> {
  const qs = new URLSearchParams(params as any).toString();
  const res = await fetch(`/api/reports${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("Failed to load reports");
  return res.json();
}

export async function getReport(id: string): Promise<ReportDTO> {
  const res = await fetch(`/api/reports/${id}`);
  if (!res.ok) throw new Error("Not found");
  return res.json();
}

export async function createReport(data: Omit<CreateReportRequest, "photoUrl" | "audioUrl"> & { photoFile?: File | null; audioFile?: File | null }): Promise<ReportDTO> {
  const form = new FormData();
  form.set("description", data.description);
  form.set("category", data.category);
  form.set("urgency", data.urgency);
  if (data.photoFile) form.set("photo", data.photoFile);
  if (data.audioFile) form.set("audio", data.audioFile);
  if (data.location) form.set("location", JSON.stringify(data.location));
  const res = await fetch(`/api/reports`, { method: "POST", body: form });
  if (!res.ok) throw new Error("Failed to create report");
  return res.json();
}

export async function updateReport(id: string, patch: UpdateReportRequest): Promise<ReportDTO> {
  const res = await fetch(`/api/reports/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
  if (!res.ok) throw new Error("Failed to update report");
  return res.json();
}

export async function getAnalytics(): Promise<AnalyticsResponse> {
  const res = await fetch(`/api/analytics`);
  if (!res.ok) throw new Error("Failed to load analytics");
  return res.json();
}
