import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createReport, listReports, updateReport } from "@/lib/api";
import type { ReportDTO, ReportStatus, ReportUrgency, ReportLocation, ReportCategory } from "@shared/api";

interface ReportsContextValue {
  reports: ReportDTO[];
  addReport: (r: { description: string; category: ReportCategory; urgency: ReportUrgency; photoFile?: File | null; audioFile?: File | null; location?: ReportLocation | null }) => Promise<string>;
  updateStatus: (id: string, status: ReportStatus) => Promise<void>;
}

const ReportsContext = createContext<ReportsContextValue | undefined>(undefined);

export function ReportsProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const prevStatuses = useRef<Record<string, ReportStatus>>({});

  const reportsQuery = useQuery({
    queryKey: ["reports"],
    queryFn: () => listReports(),
    refetchInterval: 5000,
    select: (data) => data.sort((a, b) => b.createdAt - a.createdAt),
  });

  // Notify on status changes (run in effect to avoid updating other components during render)
  const current = reportsQuery.data ?? [];

  useEffect(() => {
    for (const r of current) {
      const prev = prevStatuses.current[r.id];
      if (prev && prev !== r.status) {
        if (r.status === "acknowledged") toast({ title: "Report acknowledged", description: "City staff has reviewed your report." });
        if (r.status === "in_progress") toast({ title: "Work in progress", description: "A crew has been assigned to your issue." });
        if (r.status === "resolved") toast({ title: "Issue resolved", description: "Thanks for helping improve the city!" });
      }
      prevStatuses.current[r.id] = r.status;
    }
  }, [current, toast]);

  const addMutation = useMutation({
    mutationFn: createReport,
    onSuccess: (r) => {
      toast({ title: "Report submitted", description: "We'll notify you as it progresses." });
      prevStatuses.current[r.id] = r.status;
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReportStatus }) => updateReport(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports"] }),
  });

  const addReport = useCallback<ReportsContextValue["addReport"]>(async (r) => {
    const created = await addMutation.mutateAsync(r as any);
    return created.id;
  }, [addMutation]);

  const updateStatus = useCallback<ReportsContextValue["updateStatus"]>(async (id, status) => {
    await updateMutation.mutateAsync({ id, status });
  }, [updateMutation]);

  const value = useMemo<ReportsContextValue>(() => ({ reports: current, addReport, updateStatus }), [current, addReport, updateStatus]);

  return <ReportsContext.Provider value={value}>{children}</ReportsContext.Provider>;
}

export function useReports() {
  const ctx = useContext(ReportsContext);
  if (!ctx) throw new Error("useReports must be used within ReportsProvider");
  return ctx;
}
