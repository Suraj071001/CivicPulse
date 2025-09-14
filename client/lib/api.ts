import type { AnalyticsResponse, CreateReportRequest, ReportDTO, ReportsQuery, UpdateReportRequest } from "@shared/api";

async function tryFetch(input: string, init?: RequestInit) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const candidates: string[] = [];

  // direct relative
  candidates.push(input);
  // absolute origin
  if (origin) candidates.push(`${origin}${input}`);
  // netlify function variants
  candidates.push(`/.netlify/functions/api${input}`); // maps to /api/xxx inside serverless wrapper when function mounted at root
  candidates.push(`/.netlify/functions/api/api${input}`); // when wrapper expects /api/*
  // local dev common paths
  candidates.push(`/.netlify/functions${input}`);
  candidates.push(`/.netlify/functions/api${input.replace(/^\/api/, "")}`);
  // try with ./ prefix (relative)
  candidates.push(`.${input}`);

  let lastErr: any = null;
  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate, init as any);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return res;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("Failed to fetch");
}

export async function listReports(params: ReportsQuery = {}): Promise<ReportDTO[]> {
  const qs = new URLSearchParams(params as any).toString();
  try {
    const res = await tryFetch(`/api/reports${qs ? `?${qs}` : ""}`);
    return res.json();
  } catch (e) {
    // network/backend unavailable — return empty list so UI remains operational
    // log for debugging
    // eslint-disable-next-line no-console
    console.warn("listReports: backend unavailable, returning empty list", e);
    return [];
  }
}

export async function getReport(id: string): Promise<ReportDTO> {
  const res = await tryFetch(`/api/reports/${id}`);
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
  const res = await tryFetch(`/api/reports`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
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
  const res = await tryFetch(`/api/reports/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
  return res.json();
}

export async function getAnalytics(): Promise<AnalyticsResponse> {
  const res = await tryFetch(`/api/analytics`);
  return res.json();
}
