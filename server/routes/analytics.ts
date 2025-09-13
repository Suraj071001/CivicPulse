import express from "express";
import type { RequestHandler } from "express";
import type { AnalyticsResponse, ReportDTO } from "@shared/api";
import { JsonStore } from "../storage/dataStore";

const store = new JsonStore<ReportDTO>("server/data/reports.json");

export const analyticsRouter = express.Router();

analyticsRouter.get("/", (async (_req, res) => {
  const all = await store.list();
  const byStatus: any = { submitted: 0, acknowledged: 0, in_progress: 0, resolved: 0 };
  const byCategory: any = { pothole: 0, streetlight: 0, trash: 0, graffiti: 0, water: 0, other: 0 };
  const byUrgency: any = { low: 0, medium: 0, high: 0 };
  const daily: Record<string, number> = {};

  for (const r of all) {
    byStatus[r.status]++;
    byCategory[r.category]++;
    byUrgency[r.urgency]++;
    const d = new Date(r.createdAt);
    const key = d.toISOString().slice(0, 10);
    daily[key] = (daily[key] ?? 0) + 1;
  }

  const totals = { total: all.length, active: all.length - byStatus.resolved, resolved: byStatus.resolved };
  const dailyCounts = Object.entries(daily)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, count]) => ({ date, count }));
  const response: AnalyticsResponse = { totals, byStatus, byCategory, byUrgency, dailyCounts };
  res.json(response);
}) as RequestHandler);
