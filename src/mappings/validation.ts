export type ValidationIssue = {
  level: "error" | "warning" | "info";
  code: string;
  message: string;
  rowId?: string;
  mappingId?: string;
  targetId?: string;
  columnId?: string;
};
