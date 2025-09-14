import type { RequestHandler } from "express";
import express from "express";
import path from "path";
import fs from "fs";
import { JsonStore } from "../storage/dataStore";
import type { CreateReportRequest, ReportDTO, ReportsQuery, UpdateReportRequest } from "@shared/api";
import { determineDepartment } from "../services/routing";

const uploadsDir = path.resolve(process.cwd(), "public/uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

function saveDataUrl(dataUrl: string, prefix: string): string | null {
  try {
    const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
    if (!match) return null;
    const mime = match[1];
    const base64 = match[2];
    const buf = Buffer.from(base64, "base64");
    const ext = mimeToExt(mime);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${prefix}${ext}`;
    fs.writeFileSync(path.join(uploadsDir, name), buf);
    return `/uploads/${name}`;
  } catch {
    return null;
  }
}
function mimeToExt(mime: string) {
  if (mime.includes("png")) return ".png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return ".jpg";
  if (mime.includes("webp")) return ".webp";
  if (mime.includes("gif")) return ".gif";
  if (mime.includes("ogg")) return ".ogg";
  if (mime.includes("mp4")) return ".mp4";
  if (mime.includes("webm")) return ".webm";
  return "";
}

const store = new JsonStore<ReportDTO>("server/data/reports.json");

export const reportsRouter = express.Router();

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// List with filtering
reportsRouter.get("/", (async (req, res) => {
  const qraw = req.query as any;
  const q: ReportsQuery = {
    status: qraw.status,
    category: qraw.category,
    urgency: qraw.urgency,
    department: qraw.department,
    q: qraw.q,
    centerLat: qraw.centerLat !== undefined ? Number(qraw.centerLat) : undefined,
    centerLng: qraw.centerLng !== undefined ? Number(qraw.centerLng) : undefined,
    radiusKm: qraw.radiusKm !== undefined ? Number(qraw.radiusKm) : undefined,
    hasLocation: qraw.hasLocation !== undefined ? String(qraw.hasLocation) === "true" : undefined,
  };
  const all = await store.list();
  const filtered = all.filter((r) => {
    if (q.status && r.status !== q.status) return false;
    if (q.category && r.category !== q.category) return false;
    if (q.urgency && r.urgency !== q.urgency) return false;
    if (q.department && r.department !== q.department) return false;
    if (q.hasLocation === true && !r.location) return false;
    if (q.hasLocation === false && r.location) return false;
    if (q.centerLat !== undefined && q.centerLng !== undefined && q.radiusKm !== undefined) {
      if (!r.location) return false;
      const d = distanceKm(q.centerLat!, q.centerLng!, r.location.lat, r.location.lng);
      if (d > q.radiusKm!) return false;
    }
    if (q.q) {
      const s = q.q.toLowerCase();
      const hay = `${r.description} ${r.department} ${r.assignee ?? ""}`.toLowerCase();
      if (!hay.includes(s)) return false;
    }
    return true;
  });
  res.json(filtered);
}) as RequestHandler);

// Get by id
reportsRouter.get("/:id", (async (req, res) => {
  const r = await store.get(req.params.id);
  if (!r) return res.status(404).json({ error: "Not found" });
  res.json(r);
}) as RequestHandler);

// Create
reportsRouter.post("/", (async (req, res) => {
  try {
    const body = req.body as any;
    const location = body.location ?? null;
    const payload: CreateReportRequest = {
      description: String(body.description || ""),
      category: body.category,
      urgency: body.urgency,
      location,
    };
    const id = crypto.randomUUID();

    const photoUrl = body.photoDataUrl ? saveDataUrl(body.photoDataUrl, "photo") : null;
    const audioUrl = body.audioDataUrl ? saveDataUrl(body.audioDataUrl, "audio") : null;

    const report: ReportDTO = {
      id,
      description: payload.description,
      category: payload.category,
      urgency: payload.urgency,
      location: payload.location ?? null,
      createdAt: Date.now(),
      status: "submitted",
      department: determineDepartment(payload.category),
      assignee: null,
      photoUrl,
      audioUrl,
    };

    await store.put(report);

    // Auto-progress statuses (non-persistent timers)
    setTimeout(() => { store.update(id, { status: "acknowledged" } as Partial<ReportDTO>).catch(() => {}); }, 1500);
    setTimeout(() => { store.update(id, { status: "in_progress" } as Partial<ReportDTO>).catch(() => {}); }, 5000);
    setTimeout(() => { store.update(id, { status: "resolved" } as Partial<ReportDTO>).catch(() => {}); }, 15000);

    res.status(201).json(report);
  } catch (e) {
    res.status(400).json({ error: "Invalid payload" });
  }
}) as RequestHandler);

// Update
reportsRouter.patch("/:id", (async (req, res) => {
  const body = req.body as UpdateReportRequest;
  const updated = await store.update(req.params.id, body as Partial<ReportDTO>);
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json(updated);
}) as RequestHandler);
