import { z } from "zod";
import { mappingsSchema } from "../mappings/schema";
import { dataProjectStateSchema } from "./dataProjectState";

const nonBlankString = z.string().trim().min(1);
const nonNegativeInteger = z.number().int().nonnegative();
const httpsUrl = z
  .url()
  .refine((value) => value.startsWith("https://"), "URL must use HTTPS.");

const templateProjectStateSchema = z
  .object({
    fileName: nonBlankString,
    fileSize: nonNegativeInteger,
    acceptedSvg: nonBlankString,
    sourceStatus: z.enum([
      "embedded",
      "linked",
      "drive",
      "unavailable",
      "modified",
    ]),
    selectedObjectId: nonBlankString.nullable(),
  })
  .strict();

const rasterMimeTypeSchema = z.enum([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

const projectAssetSchema = z
  .object({
    id: nonBlankString,
    fileName: nonBlankString,
    fileSize: nonNegativeInteger,
    mimeType: rasterMimeTypeSchema,
    dataUrl: z.string().min(1),
  })
  .strict()
  .superRefine((asset, context) => {
    if (!asset.dataUrl.startsWith(`data:${asset.mimeType};base64,`)) {
      context.addIssue({
        code: "custom",
        path: ["dataUrl"],
        message: "Asset data URL must match its raster MIME type.",
      });
    }
  });

const sourceMetadataSchema = {
  id: nonBlankString,
  kind: z.enum(["svg", "spreadsheet", "image"]),
  fileName: nonBlankString,
  fileSize: nonNegativeInteger,
};

const persistedSourceReferenceSchema = z.discriminatedUnion("location", [
  z
    .object({
      ...sourceMetadataSchema,
      location: z.literal("embedded"),
    })
    .strict(),
  z
    .object({
      ...sourceMetadataSchema,
      location: z.literal("linked"),
      reference: nonBlankString,
    })
    .strict(),
  z
    .object({
      ...sourceMetadataSchema,
      location: z.literal("drive"),
      fileId: nonBlankString,
    })
    .strict(),
  z
    .object({
      ...sourceMetadataSchema,
      location: z.literal("https"),
      url: httpsUrl,
    })
    .strict(),
]);

const exportSettingsSchema = z
  .object({
    format: z.enum(["svg", "pdf"]),
    includeCsv: z.boolean(),
    filenameTemplate: nonBlankString,
    collisionPolicy: z.enum(["suffix", "error"]),
    continueOnError: z.boolean(),
  })
  .strict();

const projectAuditSchema = z
  .object({
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    appVersion: nonBlankString,
    templateHash: nonBlankString.optional(),
    lastTemplateUpdate: z
      .object({
        oldHash: nonBlankString,
        newHash: nonBlankString,
        updatedAt: z.string().datetime(),
        missingTargetIds: z.array(nonBlankString),
      })
      .strict()
      .optional(),
  })
  .strict();

export const projectSchema = z
  .object({
    schemaVersion: z.literal(1),
    projectId: z.string().trim().min(1, "Project ID is required."),
    name: z.string().trim().min(1, "Project name is required."),
    template: templateProjectStateSchema.optional(),
    data: dataProjectStateSchema.optional(),
    mappings: mappingsSchema,
    assets: z.array(projectAssetSchema),
    exportSettings: exportSettingsSchema,
    sources: z.array(persistedSourceReferenceSchema),
    audit: projectAuditSchema,
  })
  .strict();

export type TemplateProjectState = z.infer<typeof templateProjectStateSchema>;
export type ProjectAsset = z.infer<typeof projectAssetSchema>;
export type PersistedSourceReference = z.infer<
  typeof persistedSourceReferenceSchema
>;
export type ExportSettings = z.infer<typeof exportSettingsSchema>;
export type ProjectAudit = z.infer<typeof projectAuditSchema>;
export type Project = z.infer<typeof projectSchema>;

/** Parses a persisted project and is the single future migration dispatch point. */
export function parseProject(value: unknown): Project {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Project data must be an object.");
  }

  const schemaVersion = (value as Record<string, unknown>).schemaVersion;
  if (schemaVersion === undefined) {
    throw new Error("Project schemaVersion is required.");
  }

  switch (schemaVersion) {
    case 1:
      return projectSchema.parse(value);
    default:
      throw new Error(
        `Unsupported project schema version: ${String(schemaVersion)}.`,
      );
  }
}
