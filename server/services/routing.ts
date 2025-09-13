import { ReportCategory } from "@shared/api";

export function determineDepartment(category: ReportCategory): string {
  switch (category) {
    case "pothole":
    case "trash":
      return "Public Works";
    case "streetlight":
      return "Transportation";
    case "graffiti":
      return "Community Services";
    case "water":
      return "Utilities";
    default:
      return "General Services";
  }
}
