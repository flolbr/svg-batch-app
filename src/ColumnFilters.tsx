import {
  ActionIcon,
  Button,
  Checkbox,
  Divider,
  Group,
  Popover,
  ScrollArea,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconFilter, IconX } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { getDistinctColumnValues, type ColumnFilter } from "./data/filterRows";
import type { ColumnId, DataColumn, SourceRow } from "./data/normalizeWorkbook";

type FilterType = ColumnFilter["type"];

const filterTypeLabels: Record<FilterType, string> = {
  values: "Distinct values",
  text: "Text",
  number: "Number range",
  date: "Date range",
  blank: "Blank / non-blank",
};

function availableFilterTypes(column: DataColumn): FilterType[] {
  switch (column.inferredType) {
    case "number":
      return ["values", "number", "blank"];
    case "date":
      return ["values", "date", "blank"];
    case "boolean":
      return ["values", "blank"];
    case "mixed":
      return ["values", "text", "number", "date", "blank"];
    default:
      return ["values", "text", "blank"];
  }
}

function createFilter(
  type: FilterType,
  columnId: ColumnId,
  rows: SourceRow[],
): ColumnFilter {
  switch (type) {
    case "values":
      return {
        type,
        columnId,
        included: getDistinctColumnValues(rows, columnId),
      };
    case "text":
      return { type, columnId, operator: "contains", value: "" };
    case "number":
      return { type, columnId };
    case "date":
      return { type, columnId };
    case "blank":
      return { type, columnId, blank: true };
  }
}

function isNoopFilter(filter: ColumnFilter, rows: SourceRow[]): boolean {
  switch (filter.type) {
    case "values": {
      const values = getDistinctColumnValues(rows, filter.columnId);
      return (
        filter.included.length === values.length &&
        values.every((value) => filter.included.includes(value))
      );
    }
    case "text":
      return filter.value.trim() === "";
    case "number":
      return filter.min === undefined && filter.max === undefined;
    case "date":
      return !filter.from && !filter.to;
    case "blank":
      return false;
  }
}

function filterSummary(filter: ColumnFilter): string {
  switch (filter.type) {
    case "values":
      return `${filter.included.length} value${filter.included.length === 1 ? "" : "s"}`;
    case "text":
      return `${filter.operator} “${filter.value}”`;
    case "number":
      return `${filter.min ?? "−∞"} to ${filter.max ?? "∞"}`;
    case "date":
      return `${filter.from ?? "start"} to ${filter.to ?? "end"}`;
    case "blank":
      return filter.blank ? "blank" : "non-blank";
  }
}

export function ColumnFilters({
  columns,
  filters,
  onChange,
  rows,
}: {
  columns: DataColumn[];
  filters: ColumnFilter[];
  onChange: (filters: ColumnFilter[]) => void;
  rows: SourceRow[];
}) {
  const [opened, setOpened] = useState(false);
  const [draft, setDraft] = useState<ColumnFilter | null>(null);
  const activeColumn =
    columns.find((column) => column.id === draft?.columnId) ?? columns[0];
  const activeDraft =
    draft && draft.columnId === activeColumn?.id
      ? draft
      : activeColumn
        ? (filters.find((filter) => filter.columnId === activeColumn.id) ??
          createFilter("values", activeColumn.id, rows))
        : null;
  const distinctValues = useMemo(
    () => (activeColumn ? getDistinctColumnValues(rows, activeColumn.id) : []),
    [activeColumn, rows],
  );

  useEffect(() => {
    setDraft(null);
  }, [columns, rows]);

  function chooseColumn(columnId: string | null) {
    const column = columns.find((candidate) => candidate.id === columnId);
    if (!column) return;

    setDraft(
      filters.find((filter) => filter.columnId === column.id) ??
        createFilter("values", column.id, rows),
    );
  }

  function applyFilter() {
    if (!activeDraft) return;

    const otherFilters = filters.filter(
      (filter) => filter.columnId !== activeDraft.columnId,
    );
    onChange(
      isNoopFilter(activeDraft, rows)
        ? otherFilters
        : [...otherFilters, activeDraft],
    );
    setOpened(false);
  }

  function clearColumn(columnId: ColumnId) {
    onChange(filters.filter((filter) => filter.columnId !== columnId));
    if (activeColumn?.id === columnId) {
      setDraft(createFilter("values", columnId, rows));
    }
  }

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom-start"
      shadow="md"
      width={320}
    >
      <Popover.Target>
        <Button
          disabled={columns.length === 0}
          leftSection={<IconFilter />}
          onClick={() => setOpened((value) => !value)}
          variant={filters.length > 0 ? "light" : "default"}
        >
          Filters{filters.length > 0 ? ` (${filters.length})` : ""}
        </Button>
      </Popover.Target>
      <Popover.Dropdown aria-label="Column filters">
        <Stack gap="sm">
          <Select
            allowDeselect={false}
            aria-label="Filter column"
            comboboxProps={{ withinPortal: false }}
            data={columns.map((column) => ({
              label: column.displayName,
              value: column.id,
            }))}
            label="Column"
            onChange={chooseColumn}
            value={activeColumn?.id ?? null}
          />

          {activeDraft && activeColumn && (
            <>
              <Select
                allowDeselect={false}
                aria-label="Filter type"
                comboboxProps={{ withinPortal: false }}
                data={availableFilterTypes(activeColumn).map((type) => ({
                  label: filterTypeLabels[type],
                  value: type,
                }))}
                label="Filter type"
                onChange={(type) => {
                  if (type) {
                    setDraft(
                      createFilter(type as FilterType, activeColumn.id, rows),
                    );
                  }
                }}
                value={activeDraft.type}
              />

              {activeDraft.type === "values" && (
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" fw={600}>
                      Values
                    </Text>
                    <Group gap="xs">
                      <Button
                        onClick={() =>
                          setDraft({
                            ...activeDraft,
                            included: distinctValues,
                          })
                        }
                        size="compact-xs"
                        variant="subtle"
                      >
                        Select all
                      </Button>
                      <Button
                        onClick={() =>
                          setDraft({ ...activeDraft, included: [] })
                        }
                        size="compact-xs"
                        variant="subtle"
                      >
                        Clear
                      </Button>
                    </Group>
                  </Group>
                  <ScrollArea h={160} type="auto">
                    <Checkbox.Group
                      onChange={(included) =>
                        setDraft({ ...activeDraft, included })
                      }
                      value={activeDraft.included}
                    >
                      <Stack gap={6}>
                        {distinctValues.map((value) => (
                          <Checkbox
                            key={value}
                            label={value || "(Blank)"}
                            value={value}
                          />
                        ))}
                      </Stack>
                    </Checkbox.Group>
                  </ScrollArea>
                </Stack>
              )}

              {activeDraft.type === "text" && (
                <>
                  <Select
                    allowDeselect={false}
                    aria-label="Text operator"
                    comboboxProps={{ withinPortal: false }}
                    data={[
                      { label: "Contains", value: "contains" },
                      { label: "Equals", value: "equals" },
                    ]}
                    label="Match"
                    onChange={(operator) => {
                      if (operator) {
                        setDraft({
                          ...activeDraft,
                          operator: operator as "contains" | "equals",
                        });
                      }
                    }}
                    value={activeDraft.operator}
                  />
                  <TextInput
                    aria-label="Filter text"
                    label="Value"
                    onChange={(event) =>
                      setDraft({
                        ...activeDraft,
                        value: event.currentTarget.value,
                      })
                    }
                    value={activeDraft.value}
                  />
                </>
              )}

              {activeDraft.type === "number" && (
                <Group grow>
                  <TextInput
                    aria-label="Minimum value"
                    label="Minimum"
                    onChange={(event) =>
                      setDraft({
                        ...activeDraft,
                        min: event.currentTarget.value
                          ? Number(event.currentTarget.value)
                          : undefined,
                      })
                    }
                    type="number"
                    value={activeDraft.min ?? ""}
                  />
                  <TextInput
                    aria-label="Maximum value"
                    label="Maximum"
                    onChange={(event) =>
                      setDraft({
                        ...activeDraft,
                        max: event.currentTarget.value
                          ? Number(event.currentTarget.value)
                          : undefined,
                      })
                    }
                    type="number"
                    value={activeDraft.max ?? ""}
                  />
                </Group>
              )}

              {activeDraft.type === "date" && (
                <Group grow>
                  <TextInput
                    aria-label="Start date"
                    label="From"
                    onChange={(event) =>
                      setDraft({
                        ...activeDraft,
                        from: event.currentTarget.value || undefined,
                      })
                    }
                    type="date"
                    value={activeDraft.from ?? ""}
                  />
                  <TextInput
                    aria-label="End date"
                    label="To"
                    onChange={(event) =>
                      setDraft({
                        ...activeDraft,
                        to: event.currentTarget.value || undefined,
                      })
                    }
                    type="date"
                    value={activeDraft.to ?? ""}
                  />
                </Group>
              )}

              {activeDraft.type === "blank" && (
                <Select
                  allowDeselect={false}
                  aria-label="Blank filter"
                  comboboxProps={{ withinPortal: false }}
                  data={[
                    { label: "Blank", value: "blank" },
                    { label: "Non-blank", value: "non-blank" },
                  ]}
                  label="Show"
                  onChange={(value) => {
                    if (value) {
                      setDraft({ ...activeDraft, blank: value === "blank" });
                    }
                  }}
                  value={activeDraft.blank ? "blank" : "non-blank"}
                />
              )}

              <Group justify="space-between">
                <Button
                  color="red"
                  onClick={() => clearColumn(activeDraft.columnId)}
                  size="xs"
                  variant="subtle"
                >
                  Clear column
                </Button>
                <Button onClick={applyFilter} size="xs">
                  Apply filter
                </Button>
              </Group>
            </>
          )}

          {filters.length > 0 && (
            <>
              <Divider />
              <Stack gap="xs">
                {filters.map((filter) => {
                  const column = columns.find(
                    (candidate) => candidate.id === filter.columnId,
                  );
                  return (
                    <Group key={filter.columnId} justify="space-between">
                      <Text size="xs">
                        {column?.displayName ?? filter.columnId}:{" "}
                        {filterSummary(filter)}
                      </Text>
                      <ActionIcon
                        aria-label={`Remove ${column?.displayName ?? filter.columnId} filter`}
                        onClick={() => clearColumn(filter.columnId)}
                        size="sm"
                        variant="subtle"
                      >
                        <IconX />
                      </ActionIcon>
                    </Group>
                  );
                })}
                <Button
                  color="red"
                  onClick={() => onChange([])}
                  size="compact-xs"
                  variant="subtle"
                >
                  Clear all filters
                </Button>
              </Stack>
            </>
          )}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
