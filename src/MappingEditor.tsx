import {
  Button,
  Checkbox,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import type { DataColumn } from "./data/normalizeWorkbook";
import {
  getMappingStatus,
  mappingTypesForTarget,
} from "./mappings/mappingStatus";
import type { Mapping } from "./mappings/schema";

export type MappingTarget = {
  id: string;
  label: string;
  tagName: string;
};

type MappingEditorProps = {
  target: MappingTarget;
  columns: DataColumn[];
  mapping?: Mapping;
  onChange: (mapping: Mapping) => void;
  onRemove: () => void;
};

const typeLabels = {
  text: "Text",
  visibility: "Visibility",
  "exclusive-group": "Exclusive group",
  qr: "QR code",
  image: "Image",
} as const;

function defaultMapping(
  type: Mapping["type"],
  targetId: string,
  columnId: string,
  previous?: Mapping,
): Mapping {
  const base = {
    id: previous?.id ?? `mapping-${targetId}`,
    targetId,
    columnId: previous?.columnId ?? columnId,
    required: previous?.required,
  };
  switch (type) {
    case "text":
      return { ...base, type, fit: "keep" };
    case "visibility":
      return {
        ...base,
        type,
        trueValues: ["yes", "true", "1"],
        falseValues: ["no", "false", "0"],
        emptyBehavior: "error",
      };
    case "exclusive-group":
      return { ...base, type, match: "data-option", emptyBehavior: "error" };
    case "qr":
      return {
        ...base,
        type,
        errorCorrection: "M",
        marginModules: 4,
        emptyBehavior: "error",
      };
    case "image":
      return { ...base, type, fit: "contain", emptyBehavior: "error" };
  }
}

function values(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function MappingEditor({
  target,
  columns,
  mapping,
  onChange,
  onRemove,
}: MappingEditorProps) {
  const types = mappingTypesForTarget(target.tagName);
  const typeOptions = types.map((value) => ({
    value,
    label: typeLabels[value],
  }));
  const columnOptions = columns.map((column) => ({
    value: column.id,
    label: column.displayName,
  }));
  const status = getMappingStatus(
    target,
    mapping,
    new Set(columns.map((column) => column.id)),
  );
  const validationMessage =
    status.kind === "warning" || status.kind === "error"
      ? status.message
      : undefined;

  function selectType(type: string | null) {
    if (!type || columns.length === 0) return;
    onChange(
      defaultMapping(
        type as Mapping["type"],
        target.id,
        columns[0].id,
        mapping,
      ),
    );
  }

  return (
    <Stack gap="sm">
      <Text size="sm">
        {target.label} ({target.tagName} #{target.id})
      </Text>
      <Select
        label="Mapping type"
        data={typeOptions}
        value={mapping?.type ?? null}
        disabled={columns.length === 0}
        onChange={selectType}
      />
      {columns.length === 0 && (
        <Text c="dimmed" size="sm">
          Import or select spreadsheet data before creating a mapping.
        </Text>
      )}
      <Select
        label="Spreadsheet column"
        data={columnOptions}
        value={mapping?.columnId ?? null}
        disabled={!mapping}
        onChange={(columnId) => {
          if (mapping && columnId) onChange({ ...mapping, columnId });
        }}
      />
      {mapping && (
        <>
          <Checkbox
            label="Required"
            checked={mapping.required ?? false}
            onChange={(event) =>
              onChange({ ...mapping, required: event.currentTarget.checked })
            }
          />
          {mapping.type === "text" && (
            <>
              <Select
                label="Text fit"
                data={["keep", "shrink", "truncate", "error"]}
                value={mapping.fit}
                onChange={(fit) => {
                  if (fit)
                    onChange({ ...mapping, fit: fit as typeof mapping.fit });
                }}
              />
              {mapping.fit === "shrink" && (
                <NumberInput
                  label="Minimum font size"
                  min={0}
                  value={mapping.minFontSize ?? ""}
                  onChange={(value) => {
                    const minFontSize =
                      typeof value === "number" ? value : undefined;
                    onChange({ ...mapping, minFontSize });
                  }}
                />
              )}
            </>
          )}
          {mapping.type === "visibility" && (
            <>
              <TextInput
                label="True values"
                value={mapping.trueValues.join(", ")}
                onChange={(event) =>
                  onChange({
                    ...mapping,
                    trueValues: values(event.currentTarget.value),
                  })
                }
              />
              <TextInput
                label="False values"
                value={mapping.falseValues.join(", ")}
                onChange={(event) =>
                  onChange({
                    ...mapping,
                    falseValues: values(event.currentTarget.value),
                  })
                }
              />
              <Select
                label="Empty behavior"
                data={["hide", "show", "error"]}
                value={mapping.emptyBehavior}
                onChange={(emptyBehavior) => {
                  if (emptyBehavior) {
                    onChange({
                      ...mapping,
                      emptyBehavior:
                        emptyBehavior as typeof mapping.emptyBehavior,
                    });
                  }
                }}
              />
            </>
          )}
          {mapping.type === "exclusive-group" && (
            <>
              <Select
                label="Match"
                data={["data-option", "id"]}
                value={mapping.match}
                onChange={(match) => {
                  if (match)
                    onChange({
                      ...mapping,
                      match: match as typeof mapping.match,
                    });
                }}
              />
              <Select
                label="Empty behavior"
                data={["hide-all", "keep-template", "error"]}
                value={mapping.emptyBehavior}
                onChange={(emptyBehavior) => {
                  if (emptyBehavior) {
                    onChange({
                      ...mapping,
                      emptyBehavior:
                        emptyBehavior as typeof mapping.emptyBehavior,
                    });
                  }
                }}
              />
            </>
          )}
          {mapping.type === "qr" && (
            <>
              <Select
                label="Error correction"
                data={["L", "M", "Q", "H"]}
                value={mapping.errorCorrection}
                onChange={(errorCorrection) => {
                  if (errorCorrection) {
                    onChange({
                      ...mapping,
                      errorCorrection:
                        errorCorrection as typeof mapping.errorCorrection,
                    });
                  }
                }}
              />
              <NumberInput
                label="Margin modules"
                min={0}
                step={1}
                value={mapping.marginModules}
                onChange={(marginModules) => {
                  if (typeof marginModules === "number") {
                    onChange({ ...mapping, marginModules });
                  }
                }}
              />
              <Select
                label="Empty behavior"
                data={["hide", "error"]}
                value={mapping.emptyBehavior}
                onChange={(emptyBehavior) => {
                  if (emptyBehavior) {
                    onChange({
                      ...mapping,
                      emptyBehavior:
                        emptyBehavior as typeof mapping.emptyBehavior,
                    });
                  }
                }}
              />
            </>
          )}
          {mapping.type === "image" && (
            <>
              <Select
                label="Image fit"
                data={["contain", "cover", "stretch"]}
                value={mapping.fit}
                onChange={(fit) => {
                  if (fit)
                    onChange({ ...mapping, fit: fit as typeof mapping.fit });
                }}
              />
              <Select
                label="Empty behavior"
                data={["hide", "keep-template", "error"]}
                value={mapping.emptyBehavior}
                onChange={(emptyBehavior) => {
                  if (emptyBehavior) {
                    onChange({
                      ...mapping,
                      emptyBehavior:
                        emptyBehavior as typeof mapping.emptyBehavior,
                    });
                  }
                }}
              />
            </>
          )}
          {validationMessage ? (
            <Text c="red" size="sm" role="status">
              {validationMessage}
            </Text>
          ) : (
            <Text c="dimmed" size="sm">
              Mapping configured.
            </Text>
          )}
          <Button color="red" variant="subtle" onClick={onRemove}>
            Remove mapping
          </Button>
        </>
      )}
    </Stack>
  );
}
