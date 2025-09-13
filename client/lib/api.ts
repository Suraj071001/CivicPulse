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
  const payload: any = {
    description: data.description,
    category: data.category,
    urgency: data.urgency,
    location: data.location ?? null,
  };
  if (data.photoFile) payload.photoDataUrl = await fileToDataUrl(data.photoFile);
  if (data.audioFile) payload.audioDataUrl = await fileToDataUrl(data.audioFile);
  const res = await fetch(`/api/reports`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error("Failed to create report");
  return res.json();
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read error"));
    reader.readAsDataURL(file);
  });
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
