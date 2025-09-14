/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

export type ReportStatus = "submitted" | "acknowledged" | "in_progress" | "resolved";
export type ReportUrgency = "low" | "medium" | "high";
export type ReportCategory = "pothole" | "streetlight" | "trash" | "graffiti" | "water" | "other";

export interface ReportLocation {
  lat: number;
  lng: number;
  accuracy?: number | null;
  address?: string | null;
}

export interface ReportDTO {
  id: string;
  description: string;
  category: ReportCategory;
  urgency: ReportUrgency;
  photoUrl?: string | null;
  audioUrl?: string | null;
  location?: ReportLocation | null;
  createdAt: number;
  status: ReportStatus;
  department: string;
  assignee?: string | null;
}

export interface CreateReportRequest {
  description: string;
  category: ReportCategory;
  urgency: ReportUrgency;
  location?: ReportLocation | null;
}

export interface UpdateReportRequest {
  status?: ReportStatus;
  assignee?: string | null;
  department?: string;
  description?: string;
}

export interface ReportsQuery {
  status?: ReportStatus;
  category?: ReportCategory;
  urgency?: ReportUrgency;
  department?: string;
  q?: string;
  centerLat?: number;
  centerLng?: number;
  radiusKm?: number;
  hasLocation?: boolean;
}

export interface AnalyticsResponse {
  totals: {
    total: number;
    active: number;
    resolved: number;
  };
  byStatus: Record<ReportStatus, number>;
  byCategory: Record<ReportCategory, number>;
  byUrgency: Record<ReportUrgency, number>;
  dailyCounts: Array<{ date: string; count: number }>;
}
