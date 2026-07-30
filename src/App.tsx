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
  IconGripVertical,
  IconHelpCircle,
  IconMinus,
  IconPlus,
  IconSearch,
  IconSettings,
  IconUpload,
} from "@tabler/icons-react";
import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useRef,
} from "react";
import { type PanelWeights, useAppStore } from "./store";

const rows = [
  ["Alice Martin", "Premium", "Paris", "DOC-001"],
  ["Bob Smith", "Standard", "Lyon", "DOC-002"],
  ["Alicia Morel", "VIP", "Marseille", "DOC-003"],
];

const minimumPanelWidths = [360, 300, 360];

type ResizeSession = {
  dividerIndex: number;
  startX: number;
  widths: number[];
};

function PanelTitle({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Group gap="xs">
      {icon}
      <Title order={2}>{children}</Title>
    </Group>
  );
}

function PanelResizeHandle({
  dividerIndex,
  label,
  onKeyDown,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
  value,
}: {
  dividerIndex: number;
  label: string;
  onKeyDown: (
    dividerIndex: number,
    event: KeyboardEvent<HTMLDivElement>,
  ) => void;
  onPointerDown: (
    dividerIndex: number,
    event: PointerEvent<HTMLDivElement>,
  ) => void;
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerEnd: (event: PointerEvent<HTMLDivElement>) => void;
  value: number;
}) {
  return (
    <div
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(value)}
      className="panel-resizer"
      onKeyDown={(event) => onKeyDown(dividerIndex, event)}
      onPointerCancel={onPointerEnd}
      onPointerDown={(event) => onPointerDown(dividerIndex, event)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      role="separator"
      tabIndex={0}
    >
      <span className="panel-resizer-thumb">
        <IconGripVertical aria-hidden="true" size={14} stroke={1.6} />
      </span>
    </div>
  );
}

export function App() {
  const workspaceRef = useRef<HTMLElement>(null);
  const resizeSession = useRef<ResizeSession | null>(null);
  const panelWeights = useAppStore((state) => state.ui.panelWeights);
  const setPanelWeights = useAppStore((state) => state.setPanelWeights);

  function readPanelWidths() {
    const panels = workspaceRef.current?.querySelectorAll(".workspace-panel");
    return panels
      ? Array.from(panels, (panel) => panel.getBoundingClientRect().width)
      : [];
  }

  function resizePanelPair(
    dividerIndex: number,
    widths: number[],
    delta: number,
  ) {
    const pairWidth = widths[dividerIndex] + widths[dividerIndex + 1];
    const minimumLeft = minimumPanelWidths[dividerIndex];
    const minimumRight = minimumPanelWidths[dividerIndex + 1];
    const leftWidth = Math.min(
      Math.max(widths[dividerIndex] + delta, minimumLeft),
      pairWidth - minimumRight,
    );
    const nextWidths = [...widths];
    nextWidths[dividerIndex] = leftWidth;
    nextWidths[dividerIndex + 1] = pairWidth - leftWidth;
    const totalWidth = nextWidths.reduce((total, width) => total + width, 0);

    setPanelWeights(
      nextWidths.map((width) => width / totalWidth) as PanelWeights,
    );
  }

  function startPanelResize(
    dividerIndex: number,
    event: PointerEvent<HTMLDivElement>,
  ) {
    resizeSession.current = {
      dividerIndex,
      startX: event.clientX,
      widths: readPanelWidths(),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function continuePanelResize(event: PointerEvent<HTMLDivElement>) {
    const session = resizeSession.current;
    if (!session) {
      return;
    }

    resizePanelPair(
      session.dividerIndex,
      session.widths,
      event.clientX - session.startX,
    );
  }

  function stopPanelResize(event: PointerEvent<HTMLDivElement>) {
    resizeSession.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function resizePanelWithKeyboard(
    dividerIndex: number,
    event: KeyboardEvent<HTMLDivElement>,
  ) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    event.preventDefault();
    const measuredWidths = readPanelWidths();
    const widths =
      measuredWidths.reduce((total, width) => total + width, 0) > 0
        ? measuredWidths
        : panelWeights.map((weight) => weight * 12);
    resizePanelPair(
      dividerIndex,
      widths,
      event.key === "ArrowLeft" ? -24 : 24,
    );
  }

  const panelTotal = panelWeights.reduce((total, weight) => total + weight, 0);
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

      <main
        className="workspace"
        aria-label="SVG batch workspace"
        ref={workspaceRef}
        style={
          {
            "--data-panel-width": `${panelWeights[0]}fr`,
            "--objects-panel-width": `${panelWeights[1]}fr`,
            "--preview-panel-width": `${panelWeights[2]}fr`,
          } as CSSProperties
        }
      >
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

        <PanelResizeHandle
          dividerIndex={0}
          label="Resize Data and SVG Objects panels"
          onKeyDown={resizePanelWithKeyboard}
          onPointerDown={startPanelResize}
          onPointerEnd={stopPanelResize}
          onPointerMove={continuePanelResize}
          value={(panelWeights[0] / panelTotal) * 100}
        />

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

        <PanelResizeHandle
          dividerIndex={1}
          label="Resize SVG Objects and Preview panels"
          onKeyDown={resizePanelWithKeyboard}
          onPointerDown={startPanelResize}
          onPointerEnd={stopPanelResize}
          onPointerMove={continuePanelResize}
          value={(panelWeights[1] / panelTotal) * 100}
        />

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
