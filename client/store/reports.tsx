import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";

export type ReportStatus = "submitted" | "acknowledged" | "in_progress" | "resolved";

export interface ReportLocation {
  lat: number;
  lng: number;
  accuracy?: number | null;
  address?: string | null;
}

export interface Report {
  id: string;
  description: string;
  urgency: "low" | "medium" | "high";
  photoUrl?: string | null;
  audioUrl?: string | null;
  location?: ReportLocation | null;
  createdAt: number;
  status: ReportStatus;
}

interface ReportsContextValue {
  reports: Report[];
  addReport: (r: Omit<Report, "id" | "createdAt" | "status">) => string;
  updateStatus: (id: string, status: ReportStatus) => void;
  clearAll: () => void;
}

const ReportsContext = createContext<ReportsContextValue | undefined>(undefined);

const LS_KEY = "city-reports-v1";

function loadFromLS(): Report[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Report[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToLS(reports: Report[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(reports));
  } catch {}
}

export function ReportsProvider({ children }: { children: React.ReactNode }) {
  const [reports, setReports] = useState<Report[]>(() => loadFromLS());
  const { toast } = useToast();
  const timers = useRef<Record<string, number[]>>({});

  useEffect(() => {
    saveToLS(reports);
  }, [reports]);

  useEffect(() => () => {
    // cleanup timers on unmount
    Object.values(timers.current).forEach((ids) => ids.forEach((t) => clearTimeout(t)));
  }, []);

  const updateStatus = useCallback((id: string, status: ReportStatus) => {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }, []);

  const scheduleProgress = useCallback(
    (id: string) => {
      // Clear existing
      timers.current[id]?.forEach((t) => clearTimeout(t));
      timers.current[id] = [];

      const pushTimer = (ms: number, fn: () => void) => {
        const t = window.setTimeout(fn, ms);
        timers.current[id].push(t);
      };

      pushTimer(1200, () => {
        updateStatus(id, "acknowledged");
        toast({ title: "Report acknowledged", description: "City staff has reviewed your report." });
      });
      pushTimer(4200, () => {
        updateStatus(id, "in_progress");
        toast({ title: "Work in progress", description: "A crew has been assigned to your issue." });
      });
      pushTimer(12000, () => {
        updateStatus(id, "resolved");
        toast({ title: "Issue resolved", description: "Thanks for helping improve the city!" });
      });
    },
    [toast, updateStatus],
  );

  const addReport = useCallback(
    (r: Omit<Report, "id" | "createdAt" | "status">) => {
      const id = crypto.randomUUID();
      const newReport: Report = {
        id,
        createdAt: Date.now(),
        status: "submitted",
        ...r,
      };
      setReports((prev) => [newReport, ...prev]);
      toast({ title: "Report submitted", description: "We'll notify you as it progresses." });
      scheduleProgress(id);
      return id;
    },
    [scheduleProgress, toast],
  );

  const clearAll = useCallback(() => {
    setReports([]);
  }, []);

  const value = useMemo<ReportsContextValue>(() => ({ reports, addReport, updateStatus, clearAll }), [reports, addReport, updateStatus, clearAll]);

  return <ReportsContext.Provider value={value}>{children}</ReportsContext.Provider>;
}

export function useReports() {
  const ctx = useContext(ReportsContext);
  if (!ctx) throw new Error("useReports must be used within ReportsProvider");
  return ctx;
}
