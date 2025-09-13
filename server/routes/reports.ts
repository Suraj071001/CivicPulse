import type { RequestHandler } from "express";
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { JsonStore } from "../storage/dataStore";
import type { AnalyticsResponse, CreateReportRequest, ReportDTO, ReportsQuery, UpdateReportRequest } from "@shared/api";
import { determineDepartment } from "../services/routing";

const uploadsDir = path.resolve(process.cwd(), "public/uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const base = path.basename(file.originalname || "upload", ext).replace(/[^a-z0-9_-]/gi, "").slice(0, 32) || "upload";
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${base}${ext}`;
    cb(null, name);
  },
});
const upload = multer({ storage });

const store = new JsonStore<ReportDTO>("server/data/reports.json");

export const reportsRouter = express.Router();

// List with filtering
reportsRouter.get("/", (async (req, res) => {
  const q = req.query as ReportsQuery;
  const all = await store.list();
  const filtered = all.filter((r) => {
    if (q.status && r.status !== q.status) return false;
    if (q.category && r.category !== q.category) return false;
    if (q.urgency && r.urgency !== q.urgency) return false;
    if (q.department && r.department !== q.department) return false;
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
reportsRouter.post("/", upload.fields([
  { name: "photo", maxCount: 1 },
  { name: "audio", maxCount: 1 },
]), (async (req, res) => {
  try {
    const body = req.body as any;
    const location = body.location ? JSON.parse(body.location) : null;
    const payload: CreateReportRequest = {
      description: String(body.description || ""),
      category: body.category,
      urgency: body.urgency,
      location,
    };
    const id = crypto.randomUUID();

    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const photo = files?.photo?.[0];
    const audio = files?.audio?.[0];

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
      photoUrl: photo ? `/uploads/${photo.filename}` : null,
      audioUrl: audio ? `/uploads/${audio.filename}` : null,
    };

    await store.put(report);
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
