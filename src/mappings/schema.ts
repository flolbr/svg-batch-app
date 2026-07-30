import { z } from "zod";

const mappingIdSchema = z.string().trim().min(1);

export const baseMappingSchema = z
  .object({
    id: mappingIdSchema,
    targetId: mappingIdSchema,
    columnId: mappingIdSchema,
    required: z.boolean().optional(),
  })
  .strict();

export const textMappingSchema = baseMappingSchema
  .extend({
    type: z.literal("text"),
    fit: z.enum(["keep", "shrink", "truncate", "error"]),
    minFontSize: z.number().positive().optional(),
  })
  .strict();

export const visibilityMappingSchema = baseMappingSchema
  .extend({
    type: z.literal("visibility"),
    trueValues: z.array(z.string()),
    falseValues: z.array(z.string()),
    emptyBehavior: z.enum(["hide", "show", "error"]),
  })
  .strict();

export const groupMappingSchema = baseMappingSchema
  .extend({
    type: z.literal("exclusive-group"),
    match: z.enum(["data-option", "id"]),
    emptyBehavior: z.enum(["hide-all", "keep-template", "error"]),
  })
  .strict();

export const qrMappingSchema = baseMappingSchema
  .extend({
    type: z.literal("qr"),
    errorCorrection: z.enum(["L", "M", "Q", "H"]),
    marginModules: z.number().int().nonnegative(),
    emptyBehavior: z.enum(["hide", "error"]),
  })
  .strict();

export const imageMappingSchema = baseMappingSchema
  .extend({
    type: z.literal("image"),
    fit: z.enum(["contain", "cover", "stretch"]),
    emptyBehavior: z.enum(["hide", "keep-template", "error"]),
  })
  .strict();

export const mappingSchema = z.discriminatedUnion("type", [
  textMappingSchema,
  visibilityMappingSchema,
  groupMappingSchema,
  qrMappingSchema,
  imageMappingSchema,
]);

export const mappingsSchema = z.array(mappingSchema);

export type BaseMapping = z.infer<typeof baseMappingSchema>;
export type TextMapping = z.infer<typeof textMappingSchema>;
export type VisibilityMapping = z.infer<typeof visibilityMappingSchema>;
export type GroupMapping = z.infer<typeof groupMappingSchema>;
export type QrMapping = z.infer<typeof qrMappingSchema>;
export type ImageMapping = z.infer<typeof imageMappingSchema>;
export type Mapping = z.infer<typeof mappingSchema>;
export type Mappings = z.infer<typeof mappingsSchema>;
