import { Button, Checkbox, Group, Popover, Stack, Text } from "@mantine/core";
import { IconColumns3 } from "@tabler/icons-react";
import type { ColumnPreferences } from "./data/columnPreferences";
import { setColumnPreference } from "./data/columnPreferences";
import type { DataColumn } from "./data/normalizeWorkbook";

export function ColumnSettings({
  columns,
  onChange,
  preferences,
}: {
  columns: DataColumn[];
  onChange: (preferences: ColumnPreferences) => void;
  preferences: ColumnPreferences;
}) {
  const columnIds = columns.map((column) => column.id);

  function change(
    preference: keyof ColumnPreferences,
    columnId: string,
    enabled: boolean,
  ) {
    onChange(
      setColumnPreference(
        preferences,
        preference,
        columnId,
        enabled,
        columnIds,
      ),
    );
  }

  return (
    <Popover position="bottom-start" shadow="md" width={320}>
      <Popover.Target>
        <Button
          disabled={columns.length === 0}
          leftSection={<IconColumns3 />}
          variant="default"
        >
          Columns ({preferences.visible.length}/{columns.length})
        </Button>
      </Popover.Target>
      <Popover.Dropdown aria-label="Column settings">
        <Stack gap="sm">
          <Group justify="space-between">
            <Text fw={600} size="sm">
              Column
            </Text>
            <Group gap="md">
              <Text c="dimmed" size="xs">
                Visible
              </Text>
              <Text c="dimmed" size="xs">
                Export
              </Text>
            </Group>
          </Group>
          {columns.map((column) => (
            <Group key={column.id} justify="space-between" wrap="nowrap">
              <Text size="sm" truncate>
                {column.displayName}
              </Text>
              <Group gap="xl" wrap="nowrap">
                <Checkbox
                  aria-label={`Show ${column.displayName} column`}
                  checked={preferences.visible.includes(column.id)}
                  onChange={(event) =>
                    change("visible", column.id, event.currentTarget.checked)
                  }
                />
                <Checkbox
                  aria-label={`Export ${column.displayName} column`}
                  checked={preferences.exported.includes(column.id)}
                  onChange={(event) =>
                    change("exported", column.id, event.currentTarget.checked)
                  }
                />
              </Group>
            </Group>
          ))}
          <Text c="dimmed" size="xs">
            {preferences.exported.length} of {columns.length} columns selected
            for export
          </Text>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
