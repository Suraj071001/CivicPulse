import type { AnalyticsResponse, CreateReportRequest, ReportDTO, ReportsQuery, UpdateReportRequest } from "@shared/api";

const FALLBACK_PREFIXES = ["", "./", "/.netlify/functions/api", "//localhost:8888"];

async function tryFetch(input: string, init?: RequestInit) {
  // try multiple prefixes to handle serverless hosting path differences
  let lastErr: any = null;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  for (const p of FALLBACK_PREFIXES) {
    // when using a function prefix, strip the leading /api from input
    let url: string;
    if (!p) {
      url = input;
    } else if (p.startsWith("/.netlify")) {
      url = `${p}${input.replace(/^\/api/, "")}`; // /.netlify/functions/api + /reports
    } else if (p.startsWith("./") || p === "") {
      url = input;
    } else if (p.startsWith("//")) {
      url = `${location.protocol}${p}${input}`;
    } else {
      url = `${p}${input}`;
    }

    // also try absolute origin path as fallback
    const candidates = [url, origin ? `${origin}${input}` : url];

    for (const candidate of candidates) {
      try {
        const res = await fetch(candidate, init as any);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res;
      } catch (e) {
        lastErr = e;
      }
    }
  }
  throw lastErr ?? new Error("Failed to fetch");
}

export async function listReports(params: ReportsQuery = {}): Promise<ReportDTO[]> {
  const qs = new URLSearchParams(params as any).toString();
  const res = await tryFetch(`/api/reports${qs ? `?${qs}` : ""}`);
  return res.json();
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
