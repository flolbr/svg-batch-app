import { z } from "zod";

const cellValueSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

const columnIdSchema = z.string().trim().min(1);
const rowIdSchema = z.string().trim().min(1);

export const normalizedWorksheetSchema = z
  .object({
    columns: z.array(
      z
        .object({
          id: columnIdSchema,
          sourceHeader: z.string(),
          displayName: z.string(),
          sourceIndex: z.number().int().nonnegative(),
          inferredType: z.enum(["text", "number", "date", "boolean", "mixed"]),
        })
        .strict(),
    ),
    rows: z.array(
      z
        .object({
          id: rowIdSchema,
          values: z.record(columnIdSchema, cellValueSchema),
          displayedValues: z.record(columnIdSchema, z.string()),
        })
        .strict(),
    ),
  })
  .strict();

export const columnFilterSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("values"),
      columnId: columnIdSchema,
      included: z.array(z.string()),
    })
    .strict(),
  z
    .object({
      type: z.literal("text"),
      columnId: columnIdSchema,
      operator: z.enum(["contains", "equals"]),
      value: z.string(),
    })
    .strict(),
  z
    .object({
      type: z.literal("number"),
      columnId: columnIdSchema,
      min: z.number().finite().optional(),
      max: z.number().finite().optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("date"),
      columnId: columnIdSchema,
      from: z.string().optional(),
      to: z.string().optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("blank"),
      columnId: columnIdSchema,
      blank: z.boolean(),
    })
    .strict(),
]);

export const worksheetProjectStateSchema = z
  .object({
    data: normalizedWorksheetSchema,
    selectedRowIds: z.array(rowIdSchema),
    filters: z.array(columnFilterSchema),
    rowOverrides: z.array(
      z
        .object({
          rowId: rowIdSchema,
          values: z.record(columnIdSchema, cellValueSchema),
        })
        .strict(),
    ),
    manualRows: z.array(
      z
        .object({
          id: rowIdSchema,
          values: z.record(columnIdSchema, cellValueSchema),
        })
        .strict(),
    ),
    columnPreferences: z
      .object({
        visible: z.array(columnIdSchema),
        exported: z.array(columnIdSchema),
      })
      .strict(),
  })
  .strict();

export const dataProjectStateSchema = z
  .object({
    fileName: z.string().trim().min(1),
    fileSize: z.number().int().nonnegative(),
    sheetNames: z.array(z.string().trim().min(1)).min(1),
    selectedSheetName: z.string().trim().min(1),
    worksheets: z.record(z.string().trim().min(1), worksheetProjectStateSchema),
  })
  .strict()
  .superRefine((state, context) => {
    if (new Set(state.sheetNames).size !== state.sheetNames.length) {
      context.addIssue({
        code: "custom",
        path: ["sheetNames"],
        message: "Worksheet names must be unique.",
      });
    }

    if (!state.sheetNames.includes(state.selectedSheetName)) {
      context.addIssue({
        code: "custom",
        path: ["selectedSheetName"],
        message: "Selected worksheet must be listed in sheetNames.",
      });
    }

    const worksheetNames = Object.keys(state.worksheets);
    if (
      worksheetNames.length !== state.sheetNames.length ||
      state.sheetNames.some((sheetName) => !(sheetName in state.worksheets))
    ) {
      context.addIssue({
        code: "custom",
        path: ["worksheets"],
        message: "Worksheets must match sheetNames.",
      });
    }
  });

export type NormalizedWorksheetState = z.infer<
  typeof normalizedWorksheetSchema
>;
export type ColumnFilterState = z.infer<typeof columnFilterSchema>;
export type WorksheetProjectState = z.infer<typeof worksheetProjectStateSchema>;
export type DataProjectState = z.infer<typeof dataProjectStateSchema>;
