import type { SvgTarget } from "../svg/validateSvgTargets";
import { mappingSchema, type Mapping } from "./schema";

export type MappingStatusKind = "unmapped" | "mapped" | "warning" | "error";

export type MappingStatus = {
  kind: MappingStatusKind;
  label: "Unmapped" | "Mapped" | "Warning" | "Error";
  message: string;
};

export function mappingTypesForTarget(tagName: string): Mapping["type"][] {
  switch (tagName.toLowerCase()) {
    case "text":
    case "tspan":
      return ["text", "visibility"];
    case "g":
      return ["exclusive-group", "qr", "visibility"];
    case "image":
      return ["image", "visibility"];
    default:
      return ["visibility"];
  }
}

export function getMappingStatus(
  target: Pick<SvgTarget, "id" | "tagName">,
  mapping: unknown | undefined,
  columnIds: ReadonlySet<string>,
): MappingStatus {
  if (mapping === undefined) {
    return {
      kind: "unmapped",
      label: "Unmapped",
      message: "No mapping configured.",
    };
  }

  const result = mappingSchema.safeParse(mapping);
  if (!result.success) {
    return {
      kind: "error",
      label: "Error",
      message:
        result.error.issues[0]?.message ?? "Mapping configuration is invalid.",
    };
  }

  if (result.data.targetId !== target.id) {
    return {
      kind: "error",
      label: "Error",
      message: "Mapping targets a different SVG object.",
    };
  }

  if (!mappingTypesForTarget(target.tagName).includes(result.data.type)) {
    return {
      kind: "error",
      label: "Error",
      message: "Mapping type is incompatible with this SVG object.",
    };
  }

  if (!columnIds.has(result.data.columnId)) {
    return {
      kind: "warning",
      label: "Warning",
      message: `Spreadsheet column "${result.data.columnId}" is unavailable in this worksheet.`,
    };
  }

  return {
    kind: "mapped",
    label: "Mapped",
    message: "Mapping configuration is valid.",
  };
}
