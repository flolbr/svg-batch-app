import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  Group,
  Paper,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  IconBox,
  IconChevronLeft,
  IconChevronRight,
  IconColumns3,
  IconDatabase,
  IconDownload,
  IconEye,
  IconFileTypeSvg,
  IconFilter,
  IconFolderOpen,
  IconHelpCircle,
  IconMinus,
  IconPlus,
  IconSearch,
  IconSettings,
  IconUpload,
} from "@tabler/icons-react";

const rows = [
  ["Alice Martin", "Premium", "Paris", "DOC-001"],
  ["Bob Smith", "Standard", "Lyon", "DOC-002"],
  ["Alicia Morel", "VIP", "Marseille", "DOC-003"],
];

function PanelTitle({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Group gap="xs">
      {icon}
      <Title order={2}>{children}</Title>
    </Group>
  );
}

export function App() {
  return (
    <div className="app-frame">
      <header className="app-header">
        <Group gap="sm">
          <div className="app-mark" aria-hidden="true">
            <IconFileTypeSvg size={24} />
          </div>
          <Title order={1}>SVG Batch Generator</Title>
          <Badge variant="light" color="gray">
            Local project
          </Badge>
        </Group>

        <Group gap="xs">
          <Button
            variant="subtle"
            color="dark"
            leftSection={<IconHelpCircle />}
          >
            Help
          </Button>
          <Button variant="subtle" color="dark" leftSection={<IconSettings />}>
            Settings
          </Button>
          <div className="user-avatar" aria-label="Current user">
            SB
          </div>
        </Group>
      </header>

      <main className="workspace" aria-label="SVG batch workspace">
        <Paper
          component="section"
          aria-labelledby="data-panel-title"
          className="workspace-panel data-panel"
          withBorder
        >
          <Stack gap="md" h="100%">
            <div id="data-panel-title">
              <PanelTitle icon={<IconDatabase size={20} />}>Data</PanelTitle>
            </div>

            <Group gap="sm">
              <Button variant="outline" leftSection={<IconUpload />}>
                Upload local file
              </Button>
              <Button
                variant="default"
                leftSection={<IconFolderOpen />}
                disabled
              >
                Open from Google Drive
              </Button>
            </Group>

            <Group gap="xs">
              <Text size="sm">Sheet:</Text>
              <Text size="sm" c="blue" fw={600}>
                No spreadsheet loaded
              </Text>
            </Group>

            <div className="data-tools">
              <TextInput
                aria-label="Search imported values"
                placeholder="Search imported values..."
                leftSection={<IconSearch size={16} />}
              />
              <select aria-label="Search columns" defaultValue="all">
                <option value="all">All columns</option>
              </select>
            </div>

            <Group gap="sm">
              <Button variant="default" leftSection={<IconFilter />}>
                Filters
              </Button>
              <Button variant="default" leftSection={<IconColumns3 />}>
                Columns
              </Button>
            </Group>

            <div className="data-table">
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>
                      <Checkbox aria-label="Select all rows" />
                    </Table.Th>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>City</Table.Th>
                    <Table.Th>Document ID</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rows.map((row, index) => (
                    <Table.Tr key={row[3]}>
                      <Table.Td>
                        <Checkbox
                          aria-label={`Select ${row[0]}`}
                          defaultChecked={index !== 1}
                        />
                      </Table.Td>
                      {row.map((cell) => (
                        <Table.Td key={cell}>{cell}</Table.Td>
                      ))}
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
              <Button
                className="add-row"
                variant="subtle"
                fullWidth
                leftSection={<IconPlus />}
              >
                Add row
              </Button>
            </div>

            <Text className="panel-footer" size="sm" c="dimmed">
              2 selected · 3 matching · 3 total
            </Text>
          </Stack>
        </Paper>

        <Paper
          component="section"
          aria-labelledby="objects-panel-title"
          className="workspace-panel objects-panel"
          withBorder
        >
          <Stack gap="md" h="100%">
            <div id="objects-panel-title">
              <PanelTitle icon={<IconBox size={20} />}>SVG Objects</PanelTitle>
            </div>
            <TextInput
              aria-label="Search SVG objects"
              placeholder="Search objects..."
              leftSection={<IconSearch size={16} />}
            />

            <div className="empty-state">
              <IconBox size={34} stroke={1.4} />
              <Text fw={600}>No SVG loaded</Text>
              <Text size="sm" c="dimmed" ta="center">
                Import an SVG to inspect its objects and configure mappings.
              </Text>
            </div>

            <div className="mapping-placeholder">
              <Text fw={600}>Mapping configuration</Text>
              <Text size="sm" c="dimmed">
                Select an SVG object to configure its mapping.
              </Text>
            </div>
          </Stack>
        </Paper>

        <Paper
          component="section"
          aria-labelledby="preview-panel-title"
          className="workspace-panel preview-panel"
          withBorder
        >
          <Stack gap="md" h="100%">
            <div id="preview-panel-title">
              <PanelTitle icon={<IconEye size={20} />}>Preview</PanelTitle>
            </div>

            <div className="preview-tools">
              <Group gap="xs">
                <Button
                  variant="default"
                  leftSection={<IconChevronLeft />}
                  disabled
                >
                  Previous
                </Button>
                <Text size="sm">0 / 0</Text>
                <Button
                  variant="default"
                  rightSection={<IconChevronRight />}
                  disabled
                >
                  Next
                </Button>
              </Group>
              <Group gap="xs">
                <Text size="sm" c="dimmed">
                  Zoom
                </Text>
                <ActionIcon variant="default" aria-label="Zoom out">
                  <IconMinus />
                </ActionIcon>
                <Text size="sm">100%</Text>
                <ActionIcon variant="default" aria-label="Zoom in">
                  <IconPlus />
                </ActionIcon>
                <Button variant="default">Fit</Button>
              </Group>
            </div>

            <div className="preview-canvas">
              <div className="preview-document">
                <IconFileTypeSvg size={52} stroke={1.3} />
                <Text fw={600}>Preview unavailable</Text>
                <Text size="sm" c="dimmed">
                  Upload an SVG template to begin.
                </Text>
              </div>
            </div>
          </Stack>
        </Paper>
      </main>

      <footer className="action-bar" aria-label="Project actions" role="region">
        <Group gap="sm">
          <Button leftSection={<IconEye />}>Validate</Button>
          <Button variant="default">Save project</Button>
          <Button leftSection={<IconDownload />}>Export selected</Button>
        </Group>
        <Text size="sm" c="dimmed">
          2 rows selected · Not validated
        </Text>
      </footer>
    </div>
  );
}
