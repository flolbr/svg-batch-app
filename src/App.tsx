import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  Group,
  Paper,
  Progress,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type Row,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  IconBox,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconCopy,
  IconDatabase,
  IconDownload,
  IconEdit,
  IconEye,
  IconFileTypeSvg,
  IconFolderOpen,
  IconGripVertical,
  IconHelpCircle,
  IconMinus,
  IconPlus,
  IconSearch,
  IconSettings,
  IconRestore,
  IconRefresh,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import {
  type ChangeEvent,
  type ClipboardEvent,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ColumnFilters } from "./ColumnFilters";
import { ColumnSettings } from "./ColumnSettings";
import { MappingEditor } from "./MappingEditor";
import { SvgObjectTree } from "./SvgObjectTree";
import { SvgPreview } from "./SvgPreview";
import { ValidationReportModal } from "./ValidationReportModal";
import type { ColumnPreferences } from "./data/columnPreferences";
import { filterRows, type ColumnFilter } from "./data/filterRows";
import { importSpreadsheet } from "./data/importSpreadsheet";
import {
  createManualRow,
  deleteManualRow,
  duplicateManualRow,
  manualRowsToSourceRows,
  pasteManualCells,
  updateManualCell,
  type ManualRow,
} from "./data/manualRows";
import type { ColumnId, DataColumn, SourceRow } from "./data/normalizeWorkbook";
import { getRowSelectionState } from "./data/rowSelection";
import {
  getEffectiveSourceRows,
  resetRowOverride,
  updateRowOverride,
  type RowOverride,
} from "./data/rowOverrides";
import { createRowSearchIndex, searchRows } from "./data/searchRows";
import { createSelectedDataCsv } from "./export/csvExport";
import {
  resolveExportFilenames,
  type FilenameCollisionPolicy,
} from "./export/filenameRules";
import { createExportManifest } from "./export/manifestExport";
import { createPdfExportFiles } from "./export/pdfExport";
import {
  runExportBatch,
  type ExportBatchProgress,
} from "./export/runExportBatch";
import { createSvgExportFiles } from "./export/svgExport";
import { createZipExport, downloadZipExport } from "./export/zipExport";
import { getMappingStatus } from "./mappings/mappingStatus";
import type { ValidationIssue } from "./mappings/validation";
import { createProjectSnapshot } from "./project/createProjectSnapshot";
import { downloadProjectHtml } from "./project/downloadProjectFile";
import {
  deleteRecoveryProject,
  saveRecoveryProject,
} from "./project/recoveryStore";
import {
  saveProjectWithFilePicker,
  type ProjectFileHandle,
  type ShowSaveProjectFilePicker,
} from "./project/saveProjectFile";
import { serializeProjectHtml } from "./project/serializeProjectHtml";
import type { Project } from "./project/projectSchema";
import { type PanelWeights, useAppStore } from "./store";
import { importSvgFile, type SvgSourceStatus } from "./svg/importSvg";
import {
  compareTemplateMappings,
  localSvgReference,
  readHttpsLinkedSvg,
  readLocalLinkedSvg,
  saveLocalSvgHandle,
  sha256,
  type LocalSvgFileHandle,
} from "./svg/linkedSvg";
import type { SvgTreeNode } from "./svg/buildSvgTree";
import {
  validateRows,
  type ValidationPipelineResult,
} from "./validation/validationPipeline";

const minimumPanelWidths = [360, 300, 360];
const MIN_PREVIEW_ZOOM = 25;
const MAX_PREVIEW_ZOOM = 200;
const PREVIEW_ZOOM_STEP = 25;
export const PROJECT_RECOVERY_DEBOUNCE_MS = 750;
type ExportFormat = "svg" | "pdf";
type ExportSettings = {
  format: ExportFormat;
  includeCsv: boolean;
  filenameTemplate: string;
  collisionPolicy: FilenameCollisionPolicy;
};
type FailedExportRetry = {
  rowIds: string[];
  settings: ExportSettings;
};
type AppProps = {
  projectDocument?: Document;
  showSaveFilePicker?: ShowSaveProjectFilePicker;
  showOpenFilePicker?: () => Promise<LocalSvgFileHandle[]>;
};
const svgSourceStatusPresentation: Record<
  SvgSourceStatus,
  { color: string; label: string }
> = {
  embedded: { color: "blue", label: "Embedded" },
  linked: { color: "teal", label: "Linked" },
  drive: { color: "indigo", label: "Drive" },
  unavailable: { color: "gray", label: "Unavailable" },
  modified: { color: "orange", label: "Modified" },
};
const emptySourceColumns: DataColumn[] = [];
const emptySourceRows: SourceRow[] = [];
const emptyManualRows: ManualRow[] = [];
const emptyRowOverrides: RowOverride[] = [];
const emptyColumnFilters: ColumnFilter[] = [];

function projectHtmlFileName(projectName: string): string {
  const safeName = projectName
    .normalize("NFC")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .trim()
    .replace(/[.\s]+$/u, "");
  return `${safeName || "svg-batch-project"}.html`;
}

function browserSaveFilePicker(): ShowSaveProjectFilePicker | undefined {
  return (
    window as unknown as {
      showSaveFilePicker?: ShowSaveProjectFilePicker;
    }
  ).showSaveFilePicker?.bind(window);
}

function browserOpenFilePicker():
  (() => Promise<LocalSvgFileHandle[]>) | undefined {
  return (
    window as unknown as {
      showOpenFilePicker?: (options: {
        types: Array<{ accept: Record<string, string[]> }>;
      }) => Promise<LocalSvgFileHandle[]>;
    }
  ).showOpenFilePicker
    ? () =>
        (
          window as unknown as {
            showOpenFilePicker: (options: {
              types: Array<{ accept: Record<string, string[]> }>;
            }) => Promise<LocalSvgFileHandle[]>;
          }
        ).showOpenFilePicker({
          types: [{ accept: { "image/svg+xml": [".svg"] } }],
        })
    : undefined;
}

function isPickerCancellation(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function recoveryFingerprint(project: Project): string {
  return JSON.stringify({
    ...project,
    audit: {
      ...project.audit,
      updatedAt: "",
    },
  });
}
const emptyColumnPreferences: ColumnPreferences = {
  visible: [],
  exported: [],
};
export const ROW_VIRTUALIZATION_THRESHOLD = 200;

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

function DataRow({
  columns,
  editingManualRowId,
  isEditingSourceRow,
  isModifiedSourceRow,
  isSelected,
  manualRow,
  manualRowIndex,
  onDeleteManualRow,
  onDuplicateManualRow,
  onManualCellChange,
  onManualCellPaste,
  onManualEditStarted,
  onResetSourceRow,
  onSourceCellChange,
  onStartSourceEdit,
  onStopSourceEdit,
  onToggleSelection,
  row,
  virtualIndex,
}: {
  columns: DataColumn[];
  editingManualRowId: string | null;
  isEditingSourceRow: boolean;
  isModifiedSourceRow: boolean;
  isSelected: boolean;
  manualRow?: ManualRow;
  manualRowIndex?: number;
  onDeleteManualRow: (rowId: string) => void;
  onDuplicateManualRow: (rowId: string) => void;
  onManualCellChange: (
    rowId: string,
    columnId: ColumnId,
    value: string,
  ) => void;
  onManualCellPaste: (rowId: string, columnId: ColumnId, value: string) => void;
  onManualEditStarted: () => void;
  onResetSourceRow: (rowId: string) => void;
  onSourceCellChange: (
    rowId: string,
    columnId: ColumnId,
    value: string,
  ) => void;
  onStartSourceEdit: (rowId: string) => void;
  onStopSourceEdit: () => void;
  onToggleSelection: (rowId: string) => void;
  row: Row<SourceRow>;
  virtualIndex?: number;
}) {
  return (
    <Table.Tr
      aria-rowindex={virtualIndex === undefined ? undefined : virtualIndex + 2}
      data-index={virtualIndex}
    >
      <Table.Td className="data-table-selection">
        <Checkbox
          aria-label={`Select row ${row.index + 1}`}
          checked={isSelected}
          onChange={() => onToggleSelection(row.original.id)}
        />
      </Table.Td>
      {row.getVisibleCells().map((cell, columnIndex) => {
        const column = columns[columnIndex];
        const isEditable = Boolean(manualRow) || isEditingSourceRow;
        return (
          <Table.Td
            className={isEditable ? "data-table-editable-cell" : undefined}
            key={cell.id}
          >
            {isEditable && column ? (
              <TextInput
                aria-label={
                  manualRow
                    ? `${column.displayName} for manual row ${(manualRowIndex ?? 0) + 1}`
                    : `${column.displayName} for imported row ${row.index + 1}`
                }
                autoFocus={
                  columnIndex === 0 &&
                  (editingManualRowId === manualRow?.id || isEditingSourceRow)
                }
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  if (manualRow) {
                    onManualCellChange(manualRow.id, column.id, value);
                  } else {
                    onSourceCellChange(row.original.id, column.id, value);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                    if (!manualRow) onStopSourceEdit();
                  }
                }}
                onFocus={() => {
                  if (
                    manualRow &&
                    editingManualRowId === manualRow.id &&
                    columnIndex === 0
                  ) {
                    onManualEditStarted();
                  }
                }}
                onPaste={(event: ClipboardEvent<HTMLInputElement>) => {
                  if (!manualRow) return;
                  const pastedText = event.clipboardData.getData("text");
                  if (pastedText.includes("\t") || pastedText.includes("\n")) {
                    event.preventDefault();
                    onManualCellPaste(manualRow.id, column.id, pastedText);
                  }
                }}
                size="xs"
                value={row.original.displayedValues[column.id] ?? ""}
                variant="unstyled"
              />
            ) : (
              flexRender(cell.column.columnDef.cell, cell.getContext())
            )}
          </Table.Td>
        );
      })}
      <Table.Td className="data-table-row-kind">
        {manualRow ? (
          <Group gap={4} wrap="nowrap">
            <Badge size="xs" variant="light">
              Manual
            </Badge>
            <ActionIcon
              aria-label={`Duplicate manual row ${(manualRowIndex ?? 0) + 1}`}
              onClick={() => onDuplicateManualRow(manualRow.id)}
              size="sm"
              variant="subtle"
            >
              <IconCopy size={14} />
            </ActionIcon>
            <ActionIcon
              aria-label={`Delete manual row ${(manualRowIndex ?? 0) + 1}`}
              color="red"
              onClick={() => onDeleteManualRow(manualRow.id)}
              size="sm"
              variant="subtle"
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Group>
        ) : (
          <Group gap={4} wrap="nowrap">
            <Badge
              color={isModifiedSourceRow ? "yellow" : "gray"}
              size="xs"
              variant="light"
            >
              {isModifiedSourceRow ? "Modified" : "Source"}
            </Badge>
            <ActionIcon
              aria-label={
                isEditingSourceRow
                  ? `Finish editing imported row ${row.index + 1}`
                  : `Edit imported row ${row.index + 1}`
              }
              onClick={() =>
                isEditingSourceRow
                  ? onStopSourceEdit()
                  : onStartSourceEdit(row.original.id)
              }
              size="sm"
              variant="subtle"
            >
              {isEditingSourceRow ? (
                <IconCheck size={14} />
              ) : (
                <IconEdit size={14} />
              )}
            </ActionIcon>
            {isModifiedSourceRow && (
              <ActionIcon
                aria-label={`Reset imported row ${row.index + 1}`}
                onClick={() => onResetSourceRow(row.original.id)}
                size="sm"
                variant="subtle"
              >
                <IconRestore size={14} />
              </ActionIcon>
            )}
          </Group>
        )}
      </Table.Td>
    </Table.Tr>
  );
}

function findSvgNode(
  nodes: SvgTreeNode[],
  id: string | null,
): SvgTreeNode | undefined {
  if (!id) return undefined;
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findSvgNode(node.children, id);
    if (child) return child;
  }
}

export function App({
  projectDocument,
  showSaveFilePicker,
  showOpenFilePicker,
}: AppProps = {}) {
  const workspaceRef = useRef<HTMLElement>(null);
  const dataTableScrollRef = useRef<HTMLDivElement>(null);
  const resizeSession = useRef<ResizeSession | null>(null);
  const cancelExportRef = useRef(false);
  const cleanProjectDocumentRef = useRef<Document | null>(null);
  const projectFileHandleRef = useRef<ProjectFileHandle | null>(null);
  const recoveryProjectIdRef = useRef<string | null>(null);
  const recoveryBaselineRef = useRef<string | null>(null);
  const recoveryWasDirtyRef = useRef(false);
  if (!cleanProjectDocumentRef.current) {
    cleanProjectDocumentRef.current =
      projectDocument ?? (document.cloneNode(true) as Document);
  }
  const [isImportingSpreadsheet, setIsImportingSpreadsheet] = useState(false);
  const [isImportingSvg, setIsImportingSvg] = useState(false);
  const [linkedSvgUrl, setLinkedSvgUrl] = useState("");
  const [isReloadingSvg, setIsReloadingSvg] = useState(false);
  const [editingManualRowId, setEditingManualRowId] = useState<string | null>(
    null,
  );
  const [editingSourceRowId, setEditingSourceRowId] = useState<string | null>(
    null,
  );
  const [searchColumn, setSearchColumn] = useState<ColumnId | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [svgSearchQuery, setSvgSearchQuery] = useState("");
  const [previewZoomPercent, setPreviewZoomPercent] = useState(100);
  const [validationReportOpened, setValidationReportOpened] = useState(false);
  const [validationResult, setValidationResult] =
    useState<ValidationPipelineResult | null>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>(
    () => useAppStore.getState().project?.exportSettings.format ?? "svg",
  );
  const [includeCsv, setIncludeCsv] = useState(
    () => useAppStore.getState().project?.exportSettings.includeCsv ?? false,
  );
  const [filenameTemplate, setFilenameTemplate] = useState(
    () =>
      useAppStore.getState().project?.exportSettings.filenameTemplate ??
      "row-{row}",
  );
  const [filenameCollisionPolicy, setFilenameCollisionPolicy] =
    useState<FilenameCollisionPolicy>(
      () =>
        useAppStore.getState().project?.exportSettings.collisionPolicy ??
        "suffix",
    );
  const [continueOnError, setContinueOnError] = useState(
    () =>
      useAppStore.getState().project?.exportSettings.continueOnError ?? false,
  );
  const [exportProgress, setExportProgress] =
    useState<ExportBatchProgress | null>(null);
  const [failedExportRetry, setFailedExportRetry] =
    useState<FailedExportRetry | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [debouncedSearchQuery] = useDebouncedValue(searchQuery, 150);
  const project = useAppStore((state) => state.project);
  const panelWeights = useAppStore((state) => state.ui.panelWeights);
  const mappings = useAppStore((state) => state.mappings);
  const spreadsheet = useAppStore((state) => state.sources.spreadsheet);
  const svg = useAppStore((state) => state.sources.svg);
  const activeRowId = useAppStore((state) => state.selection.activeRowId);
  const selectedRowIds = useAppStore((state) => state.selection.selectedRowIds);
  const selectedSvgObjectId = useAppStore(
    (state) => state.selection.svgObjectId,
  );
  const clearRowSelection = useAppStore((state) => state.clearRowSelection);
  const deselectRows = useAppStore((state) => state.deselectRows);
  const selectRows = useAppStore((state) => state.selectRows);
  const setActiveRow = useAppStore((state) => state.setActiveRow);
  const setManualRows = useAppStore((state) => state.setManualRows);
  const setMapping = useAppStore((state) => state.setMapping);
  const setColumnFilters = useAppStore((state) => state.setColumnFilters);
  const setColumnPreferences = useAppStore(
    (state) => state.setColumnPreferences,
  );
  const setRowOverrides = useAppStore((state) => state.setRowOverrides);
  const setPanelWeights = useAppStore((state) => state.setPanelWeights);
  const setSelectedWorksheet = useAppStore(
    (state) => state.setSelectedWorksheet,
  );
  const setSpreadsheetSource = useAppStore(
    (state) => state.setSpreadsheetSource,
  );
  const setSvgSource = useAppStore((state) => state.setSvgSource);
  const applyLinkedSvgUpdate = useAppStore(
    (state) => state.applyLinkedSvgUpdate,
  );
  const undoTemplateUpdate = useAppStore((state) => state.undoTemplateUpdate);
  const clearTemplateUpdateUndo = useAppStore(
    (state) => state.clearTemplateUpdateUndo,
  );
  const previousTemplate = useAppStore(
    (state) => state.sources.previousTemplate,
  );
  const removeMapping = useAppStore((state) => state.removeMapping);
  const setSvgObjectSelection = useAppStore(
    (state) => state.setSvgObjectSelection,
  );
  const toggleRowSelection = useAppStore((state) => state.toggleRowSelection);
  const sourceColumns = spreadsheet?.data.columns ?? emptySourceColumns;
  const sourceRows = spreadsheet?.data.rows ?? emptySourceRows;
  const columnFilters =
    spreadsheet?.columnFiltersBySheet[spreadsheet.selectedSheetName] ??
    emptyColumnFilters;
  const columnPreferences =
    spreadsheet?.columnPreferencesBySheet[spreadsheet.selectedSheetName] ??
    emptyColumnPreferences;
  const selectedSvgNode = useMemo(
    () => findSvgNode(svg?.tree ?? [], selectedSvgObjectId),
    [selectedSvgObjectId, svg?.tree],
  );
  const selectedMapping = mappings.find(
    (mapping) => mapping.targetId === selectedSvgObjectId,
  );
  const svgMappingStatuses = useMemo(() => {
    const columnIds = new Set(sourceColumns.map((column) => column.id));
    const mappingsByTargetId = new Map(
      mappings.map((mapping) => [mapping.targetId, mapping]),
    );
    return Object.fromEntries(
      (svg?.targets ?? []).map((target) => [
        target.id,
        getMappingStatus(target, mappingsByTargetId.get(target.id), columnIds),
      ]),
    );
  }, [mappings, sourceColumns, svg?.targets]);
  const svgSourceStatus =
    svgSourceStatusPresentation[svg?.sourceStatus ?? "unavailable"];
  const visibleColumns = useMemo(
    () =>
      sourceColumns.filter((column) =>
        columnPreferences.visible.includes(column.id),
      ),
    [columnPreferences.visible, sourceColumns],
  );
  const rowOverrides =
    spreadsheet?.rowOverridesBySheet[spreadsheet.selectedSheetName] ??
    emptyRowOverrides;
  const effectiveSourceRows = useMemo(
    () => getEffectiveSourceRows(sourceRows, rowOverrides, sourceColumns),
    [rowOverrides, sourceColumns, sourceRows],
  );
  const manualRows =
    spreadsheet?.manualRowsBySheet[spreadsheet.selectedSheetName] ??
    emptyManualRows;
  const manualSourceRows = useMemo(
    () => manualRowsToSourceRows(manualRows, sourceColumns),
    [manualRows, sourceColumns],
  );
  const allRows = useMemo(
    () => [...effectiveSourceRows, ...manualSourceRows],
    [effectiveSourceRows, manualSourceRows],
  );
  const sourceRowsById = useMemo(
    () => new Map(sourceRows.map((row) => [row.id, row])),
    [sourceRows],
  );
  const overriddenRowIds = useMemo(
    () => new Set(rowOverrides.map((override) => override.rowId)),
    [rowOverrides],
  );
  const manualRowsById = useMemo(
    () => new Map(manualRows.map((row) => [row.id, row])),
    [manualRows],
  );
  const manualRowIndexes = useMemo(
    () => new Map(manualRows.map((row, index) => [row.id, index])),
    [manualRows],
  );
  const activeSearchColumn = sourceColumns.some(
    (column) => column.id === searchColumn,
  )
    ? searchColumn
    : "all";
  const searchIndex = useMemo(
    () =>
      createRowSearchIndex(
        allRows,
        sourceColumns.map((column) => column.id),
      ),
    [allRows, sourceColumns],
  );
  const searchedRows = useMemo(
    () =>
      searchRows(
        searchIndex,
        allRows,
        editingSourceRowId ? "" : debouncedSearchQuery,
        activeSearchColumn,
      ),
    [
      activeSearchColumn,
      allRows,
      debouncedSearchQuery,
      editingSourceRowId,
      searchIndex,
    ],
  );
  const matchingRows = useMemo(
    () => filterRows(searchedRows, columnFilters),
    [columnFilters, searchedRows],
  );
  const selectedRowIdSet = useMemo(
    () => new Set(selectedRowIds),
    [selectedRowIds],
  );
  const selectedRows = useMemo(
    () => allRows.filter((row) => selectedRowIdSet.has(row.id)),
    [allRows, selectedRowIdSet],
  );
  const validationRowLabels = useMemo(
    () =>
      new Map(
        allRows.map((row, index) => [row.id, `Row ${index + 1}`] as const),
      ),
    [allRows],
  );
  const worksheetRowNumbers = useMemo(
    () => new Map(allRows.map((row, index) => [row.id, index + 1] as const)),
    [allRows],
  );
  const previewRowIds = useMemo(
    () => selectedRows.map((row) => row.id),
    [selectedRows],
  );
  const activePreviewRowIndex = activeRowId
    ? previewRowIds.indexOf(activeRowId)
    : -1;
  const activePreviewRow =
    activePreviewRowIndex >= 0 ? selectedRows[activePreviewRowIndex] : null;
  const previewSvg = useMemo(() => {
    if (!svg || !activePreviewRow) return svg?.acceptedSvg ?? null;

    const template = new DOMParser().parseFromString(
      svg.acceptedSvg,
      "image/svg+xml",
    ).documentElement as unknown as SVGSVGElement;
    return (
      validateRows({
        template,
        rows: [activePreviewRow],
        columnIds: new Set(sourceColumns.map((column) => column.id)),
        mappings,
      }).rows[0]?.svg.outerHTML ?? svg.acceptedSvg
    );
  }, [activePreviewRow, mappings, sourceColumns, svg]);
  const dataColumns = useMemo<ColumnDef<SourceRow>[]>(
    () =>
      visibleColumns.map((column) => ({
        accessorFn: (row) => row.displayedValues[column.id],
        header: column.displayName,
        id: column.id,
      })),
    [visibleColumns],
  );
  const dataTable = useReactTable({
    columns: dataColumns,
    data: matchingRows,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });
  const dataRows = dataTable.getRowModel().rows;
  const shouldVirtualizeRows = dataRows.length > ROW_VIRTUALIZATION_THRESHOLD;
  const rowVirtualizer = useVirtualizer({
    count: dataRows.length,
    enabled: shouldVirtualizeRows,
    estimateSize: () => 40,
    getItemKey: (index) => dataRows[index]?.id ?? index,
    getScrollElement: () => dataTableScrollRef.current,
    initialRect: { height: 400, width: 0 },
    overscan: 8,
  });
  const virtualRows = shouldVirtualizeRows
    ? rowVirtualizer.getVirtualItems()
    : [];
  const visibleRows = shouldVirtualizeRows
    ? rowVirtualizer.range
      ? dataRows.slice(
          rowVirtualizer.range.startIndex,
          rowVirtualizer.range.endIndex + 1,
        )
      : []
    : dataRows;
  const matchingRowIds = matchingRows.map((row) => row.id);
  const visibleRowIds = visibleRows.map((row) => row.original.id);
  const visibleSelectionState = getRowSelectionState(
    selectedRowIds,
    visibleRowIds,
  );
  const topSpacerHeight = virtualRows[0]?.start ?? 0;
  const bottomSpacerHeight =
    virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
      : 0;

  useEffect(() => {
    dataTableScrollRef.current?.scrollTo?.({ top: 0 });
  }, [activeSearchColumn, columnFilters, debouncedSearchQuery]);

  useEffect(() => {
    setEditingManualRowId(null);
    setEditingSourceRowId(null);
  }, [spreadsheet?.data]);

  useEffect(() => {
    setPreviewZoomPercent(100);
  }, [svg?.acceptedSvg]);

  useLayoutEffect(() => {
    setValidationResult(null);
    setValidationReportOpened(false);
  }, [
    exportFormat,
    filenameCollisionPolicy,
    filenameTemplate,
    mappings,
    selectedRows,
    sourceColumns,
    svg?.acceptedSvg,
  ]);

  useEffect(() => {
    if (!project) return;

    let snapshot: Project;
    try {
      snapshot = createProjectSnapshot({
        project,
        spreadsheet,
        svg,
        selectedSvgObjectId,
        mappings,
        exportSettings: {
          format: exportFormat,
          includeCsv,
          filenameTemplate,
          collisionPolicy: filenameCollisionPolicy,
          continueOnError,
        },
        updatedAt: project.audit.updatedAt,
      });
    } catch {
      return;
    }

    const fingerprint = recoveryFingerprint(snapshot);
    if (recoveryProjectIdRef.current !== project.projectId) {
      recoveryProjectIdRef.current = project.projectId;
      recoveryBaselineRef.current = fingerprint;
      recoveryWasDirtyRef.current = false;
      return;
    }

    if (fingerprint === recoveryBaselineRef.current) {
      if (recoveryWasDirtyRef.current) {
        recoveryWasDirtyRef.current = false;
        void deleteRecoveryProject(project.projectId).catch(() => {});
      }
      return;
    }

    recoveryWasDirtyRef.current = true;
    const timeout = window.setTimeout(() => {
      try {
        const recovery = createProjectSnapshot({
          project,
          spreadsheet,
          svg,
          selectedSvgObjectId,
          mappings,
          exportSettings: {
            format: exportFormat,
            includeCsv,
            filenameTemplate,
            collisionPolicy: filenameCollisionPolicy,
            continueOnError,
          },
          updatedAt: new Date().toISOString(),
        });
        void saveRecoveryProject(recovery).catch(() => {});
      } catch {
        // Invalid intermediate state is not persisted as recovery data.
      }
    }, PROJECT_RECOVERY_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [
    continueOnError,
    exportFormat,
    filenameCollisionPolicy,
    filenameTemplate,
    includeCsv,
    mappings,
    project,
    selectedSvgObjectId,
    spreadsheet,
    svg,
  ]);

  useEffect(() => {
    if (!editingManualRowId || !shouldVirtualizeRows) return;

    const rowIndex = dataRows.findIndex(
      (row) => row.original.id === editingManualRowId,
    );
    if (rowIndex !== -1) {
      rowVirtualizer.scrollToIndex(rowIndex, { align: "center" });
    }
  }, [dataRows, editingManualRowId, rowVirtualizer, shouldVirtualizeRows]);

  function addManualRow() {
    const row = createManualRow(sourceColumns.map((column) => column.id));
    setSearchQuery("");
    setColumnFilters([]);
    setManualRows([...manualRows, row]);
    setEditingManualRowId(row.id);
  }

  function changeManualCell(rowId: string, columnId: ColumnId, value: string) {
    setManualRows(updateManualCell(manualRows, rowId, columnId, value));
  }

  function pasteIntoManualCells(
    rowId: string,
    columnId: ColumnId,
    value: string,
  ) {
    setManualRows(
      pasteManualCells(
        manualRows,
        rowId,
        columnId,
        sourceColumns.map((column) => column.id),
        value,
      ),
    );
  }

  function duplicateRow(rowId: string) {
    const duplicateId = crypto.randomUUID();
    setManualRows(duplicateManualRow(manualRows, rowId, () => duplicateId));
    setEditingManualRowId(duplicateId);
  }

  function deleteRow(rowId: string) {
    setManualRows(deleteManualRow(manualRows, rowId));
    deselectRows([rowId]);
    if (editingManualRowId === rowId) setEditingManualRowId(null);
  }

  function startSourceEdit(rowId: string) {
    setSearchQuery("");
    setColumnFilters([]);
    setEditingSourceRowId(rowId);
  }

  function changeSourceCell(rowId: string, columnId: ColumnId, value: string) {
    const sourceRow = sourceRowsById.get(rowId);
    if (!sourceRow) return;

    setRowOverrides(
      updateRowOverride(rowOverrides, sourceRow, columnId, value),
    );
  }

  function resetSourceRow(rowId: string) {
    setRowOverrides(resetRowOverride(rowOverrides, rowId));
    if (editingSourceRowId === rowId) setEditingSourceRowId(null);
  }

  function runValidation(
    rows: readonly SourceRow[] = selectedRows,
    filenameIssues: readonly ValidationIssue[] = [],
  ): ValidationPipelineResult | null {
    if (!svg || rows.length === 0) return null;

    const template = new DOMParser().parseFromString(
      svg.acceptedSvg,
      "image/svg+xml",
    ).documentElement as unknown as SVGSVGElement;
    const result = validateRows({
      template,
      rows,
      columnIds: new Set(sourceColumns.map((column) => column.id)),
      filenameIssues,
      mappings,
    });
    setValidationResult(result);
    return result;
  }

  function validateSelection() {
    const filenamePlan = resolveExportFilenames({
      rows: selectedRows,
      columns: sourceColumns,
      rowNumbers: worksheetRowNumbers,
      template: filenameTemplate,
      extension: exportFormat,
      collisionPolicy: filenameCollisionPolicy,
    });
    const result = runValidation(selectedRows, filenamePlan.issues);
    if (!result) return;
    setValidationReportOpened(true);
  }

  async function saveProject() {
    const picker = showSaveFilePicker ?? browserSaveFilePicker();
    if (!project) return;

    setIsSavingProject(true);
    try {
      const snapshot = createProjectSnapshot({
        project,
        spreadsheet,
        svg,
        selectedSvgObjectId,
        mappings,
        exportSettings: {
          format: exportFormat,
          includeCsv,
          filenameTemplate,
          collisionPolicy: filenameCollisionPolicy,
          continueOnError,
        },
        updatedAt: new Date().toISOString(),
      });
      const html = serializeProjectHtml(
        cleanProjectDocumentRef.current!,
        snapshot,
      );
      const filename = projectHtmlFileName(project.name);
      if (picker) {
        projectFileHandleRef.current = await saveProjectWithFilePicker({
          html,
          suggestedName: filename,
          existingHandle: projectFileHandleRef.current ?? undefined,
          showSaveFilePicker: picker,
        });
      } else {
        downloadProjectHtml(html, filename);
      }
      recoveryProjectIdRef.current = snapshot.projectId;
      recoveryBaselineRef.current = recoveryFingerprint(snapshot);
      recoveryWasDirtyRef.current = false;
      void deleteRecoveryProject(snapshot.projectId).catch(() => {});
      useAppStore.setState({ project: snapshot });
      clearTemplateUpdateUndo();
      notifications.show({
        color: "green",
        message: picker
          ? "The self-contained project HTML was written successfully."
          : "The self-contained project HTML download has started.",
        title: picker
          ? `${project.name} saved`
          : `${project.name} download started`,
      });
    } catch (error) {
      if (!isPickerCancellation(error)) {
        notifications.show({
          color: "red",
          message:
            error instanceof Error
              ? error.message
              : "The project file could not be written.",
          title: "Project save failed",
        });
      }
    } finally {
      setIsSavingProject(false);
    }
  }

  async function exportRows(
    rows: readonly SourceRow[],
    settings: ExportSettings,
    allowPartialErrors: boolean,
  ) {
    const filenamePlan = resolveExportFilenames({
      rows,
      columns: sourceColumns,
      rowNumbers: worksheetRowNumbers,
      template: settings.filenameTemplate,
      extension: settings.format,
      collisionPolicy: settings.collisionPolicy,
    });
    const result = runValidation(rows, filenamePlan.issues);
    if (!result) return;
    const hasProjectErrors = result.projectIssues.some(
      (issue) => issue.level === "error",
    );
    if (hasProjectErrors || (result.hasErrors && !allowPartialErrors)) {
      setValidationReportOpened(true);
      return;
    }

    cancelExportRef.current = false;
    setFailedExportRetry(null);
    setIsExporting(true);
    setExportProgress({
      completed: 0,
      total: result.rows.length,
      currentFilename: null,
    });
    const notifyCancelled = () =>
      notifications.show({
        color: "gray",
        message:
          "Completed files were discarded and no archive was downloaded.",
        title: "Export cancelled",
      });
    try {
      const requests = result.rows.map((row, index) => ({
        rowId: row.rowId,
        filename: filenamePlan.entries[index].actualFilename,
        svg: row.svg,
      }));
      const batch = await runExportBatch(
        result.rows.map((row, index) => ({
          rowId: row.rowId,
          requestedFilename: filenamePlan.entries[index].requestedFilename,
          warnings: row.issues
            .filter((issue) => issue.level === "warning")
            .map((issue) => issue.message),
          errors: row.issues
            .filter((issue) => issue.level === "error")
            .map((issue) => issue.message),
          createFile: async () => {
            if (settings.format === "pdf") {
              return (await createPdfExportFiles([requests[index]]))[0];
            }
            return createSvgExportFiles([requests[index]])[0];
          },
        })),
        {
          continueOnError: allowPartialErrors,
          isCancelled: () => cancelExportRef.current,
          onProgress: setExportProgress,
        },
      );
      if (batch.cancelled || cancelExportRef.current) {
        notifyCancelled();
        return;
      }

      setFailedExportRetry(
        batch.failedRowIds.length > 0
          ? {
              rowIds: batch.failedRowIds,
              settings,
            }
          : null,
      );

      const successfulRowIds = new Set(
        batch.entries
          .filter((entry) => entry.status === "success")
          .map((entry) => entry.rowId),
      );
      const csvFile = settings.includeCsv
        ? createSelectedDataCsv(
            sourceColumns.filter((column) =>
              columnPreferences.exported.includes(column.id),
            ),
            rows.filter((row) => successfulRowIds.has(row.id)),
          )
        : null;
      const manifestFile = createExportManifest(batch.entries);
      const archive = await createZipExport([
        ...batch.files,
        ...(csvFile ? [csvFile] : []),
        manifestFile,
      ]);
      if (cancelExportRef.current) {
        setFailedExportRetry(null);
        notifyCancelled();
        return;
      }
      downloadZipExport(archive);

      if (batch.failedRowIds.length > 0) {
        const skippedCount = batch.entries.filter(
          (entry) => entry.status === "skipped",
        ).length;
        notifications.show({
          color: "yellow",
          message: `${batch.failedRowIds.length} failed${skippedCount > 0 ? ` and ${skippedCount} skipped` : ""}. Use Retry failed to try the failed rows again.`,
          title: "Partial export created",
        });
      }
    } catch (error) {
      notifications.show({
        color: "red",
        message:
          error instanceof Error
            ? error.message
            : "The export could not be created.",
        title: `${settings.format.toUpperCase()} export failed`,
      });
    } finally {
      cancelExportRef.current = false;
      setExportProgress(null);
      setIsExporting(false);
    }
  }

  async function retryFailedRows() {
    if (!failedExportRetry) return;
    const failedRowIds = new Set(failedExportRetry.rowIds);
    const rows = allRows.filter((row) => failedRowIds.has(row.id));
    if (rows.length === 0) {
      setFailedExportRetry(null);
      return;
    }

    await exportRows(rows, failedExportRetry.settings, true);
  }

  async function handleSpreadsheetFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) {
      return;
    }

    setIsImportingSpreadsheet(true);
    try {
      const importedSpreadsheet = await importSpreadsheet(file);
      setSpreadsheetSource(importedSpreadsheet);
      notifications.show({
        color: "green",
        message: `${importedSpreadsheet.sheetNames.length} worksheet${importedSpreadsheet.sheetNames.length === 1 ? "" : "s"} found.`,
        title: `${importedSpreadsheet.fileName} imported`,
      });
    } catch (error) {
      notifications.show({
        color: "red",
        message:
          error instanceof Error
            ? error.message
            : "The spreadsheet could not be read.",
        title: "Spreadsheet import failed",
      });
    } finally {
      setIsImportingSpreadsheet(false);
    }
  }

  async function handleSvgFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    setIsImportingSvg(true);
    try {
      const importedSvg = await importSvgFile(file);
      setSvgSearchQuery("");
      setSvgSource(importedSvg);
      notifications.show({
        color: "green",
        message: "The SVG passed the supported-feature and resource checks.",
        title: `${importedSvg.fileName} imported`,
      });
    } catch (error) {
      notifications.show({
        color: "red",
        message:
          error instanceof Error ? error.message : "The SVG could not be read.",
        title: "SVG import failed",
      });
    } finally {
      setIsImportingSvg(false);
    }
  }

  async function applyLinkedTemplate(
    nextSvg: NonNullable<typeof svg>,
    source: NonNullable<Project["sources"][number]>,
  ) {
    if (!svg || !project) {
      throw new Error("Import an SVG into a saved project before linking it.");
    }
    const comparison = compareTemplateMappings(svg, nextSvg, mappings);
    const [oldHash, newHash] = await Promise.all([
      sha256(svg.acceptedSvg),
      sha256(nextSvg.acceptedSvg),
    ]);
    applyLinkedSvgUpdate({
      svg: nextSvg,
      mappings: comparison.preserved,
      source: {
        ...source,
        fileName: nextSvg.fileName,
        fileSize: nextSvg.fileSize,
      },
      oldHash,
      newHash,
      missingTargetIds: comparison.missingTargetIds,
    });
    const discarded =
      comparison.missingTargetIds.length +
      comparison.incompatibleTargetIds.length;
    notifications.show({
      color: discarded ? "orange" : "green",
      title: oldHash === newHash ? "Linked SVG checked" : "Linked SVG updated",
      message: `${comparison.preserved.length} mapping${comparison.preserved.length === 1 ? "" : "s"} preserved${discarded ? `; ${comparison.missingTargetIds.length} missing and ${comparison.incompatibleTargetIds.length} incompatible.` : "."} ${comparison.newTargetIds.length} new object${comparison.newTargetIds.length === 1 ? "" : "s"}.`,
    });
  }

  async function linkLocalSvg() {
    if (!project) {
      notifications.show({
        color: "orange",
        title: "Save a project first",
        message:
          "A local link needs a project ID for its portable lookup reference.",
      });
      return;
    }
    const picker = showOpenFilePicker ?? browserOpenFilePicker();
    if (!picker) {
      notifications.show({
        color: "orange",
        title: "Local linking unavailable",
        message: "This browser does not support the File System Access API.",
      });
      return;
    }
    try {
      setIsReloadingSvg(true);
      const handle = (await picker())[0];
      if (!handle) return;
      const reference = localSvgReference(project.projectId);
      await saveLocalSvgHandle(reference, handle);
      await applyLinkedTemplate(await readLocalLinkedSvg(reference), {
        id: "svg-source",
        kind: "svg",
        location: "linked",
        reference,
        fileName: "linked.svg",
        fileSize: 0,
      });
    } catch (error) {
      if (!isPickerCancellation(error))
        notifications.show({
          color: "red",
          title: "Local SVG link failed",
          message:
            error instanceof Error
              ? error.message
              : "The SVG could not be linked.",
        });
    } finally {
      setIsReloadingSvg(false);
    }
  }

  async function linkHttpsSvg() {
    try {
      const url = new URL(linkedSvgUrl);
      if (url.protocol !== "https:")
        throw new Error("Linked SVG URLs must use HTTPS.");
      setIsReloadingSvg(true);
      await applyLinkedTemplate(await readHttpsLinkedSvg(url.toString()), {
        id: "svg-source",
        kind: "svg",
        location: "https",
        url: url.toString(),
        fileName: "linked.svg",
        fileSize: 0,
      });
      setLinkedSvgUrl("");
    } catch (error) {
      notifications.show({
        color: "red",
        title: "HTTPS SVG link failed",
        message:
          error instanceof Error
            ? error.message
            : "The SVG could not be linked.",
      });
    } finally {
      setIsReloadingSvg(false);
    }
  }

  async function reloadLinkedSvg() {
    const source = project?.sources.find(
      (candidate) => candidate.kind === "svg",
    );
    if (!source || source.location === "embedded") return;
    try {
      setIsReloadingSvg(true);
      if (source.location === "linked") {
        await applyLinkedTemplate(
          await readLocalLinkedSvg(source.reference),
          source,
        );
      } else if (source.location === "https") {
        await applyLinkedTemplate(await readHttpsLinkedSvg(source.url), source);
      } else if (source.location === "drive") {
        throw new Error(
          "Google Drive SVG reload is available when the hosted Drive adapter is configured.",
        );
      }
    } catch (error) {
      notifications.show({
        color: "orange",
        title: "Linked SVG unavailable",
        message: `${error instanceof Error ? error.message : "Reload failed."} The embedded SVG remains active.`,
      });
    } finally {
      setIsReloadingSvg(false);
    }
  }

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
    resizePanelPair(dividerIndex, widths, event.key === "ArrowLeft" ? -24 : 24);
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
              <Button
                component="label"
                variant="outline"
                leftSection={<IconUpload />}
                loading={isImportingSpreadsheet}
              >
                Upload local file
                <input
                  accept=".csv,.xlsx,.xls"
                  aria-label="Choose a CSV, XLSX, or XLS file"
                  hidden
                  onChange={handleSpreadsheetFile}
                  type="file"
                />
              </Button>
              <Button
                disabled={!project || isReloadingSvg}
                leftSection={<IconFolderOpen size={16} />}
                onClick={() => void linkLocalSvg()}
                variant="subtle"
              >
                Link local SVG
              </Button>
              {svg?.sourceStatus === "linked" && (
                <Button
                  disabled={isReloadingSvg}
                  leftSection={<IconRefresh size={16} />}
                  loading={isReloadingSvg}
                  onClick={() => void reloadLinkedSvg()}
                  variant="subtle"
                >
                  Reload linked SVG
                </Button>
              )}
              {previousTemplate && (
                <Button
                  leftSection={<IconRestore size={16} />}
                  onClick={undoTemplateUpdate}
                  variant="subtle"
                >
                  Undo template update
                </Button>
              )}
              <Button
                variant="default"
                leftSection={<IconFolderOpen />}
                disabled
              >
                Open from Google Drive
              </Button>
            </Group>

            <Group gap="xs">
              <Text size="sm">Source:</Text>
              <Text size="sm" c="blue" fw={600}>
                {spreadsheet
                  ? `${spreadsheet.fileName} · ${spreadsheet.sheetNames.length} worksheet${spreadsheet.sheetNames.length === 1 ? "" : "s"}`
                  : "No spreadsheet loaded"}
              </Text>
            </Group>

            {spreadsheet && (
              <Select
                allowDeselect={false}
                aria-label="Worksheet"
                data={spreadsheet.sheetNames}
                disabled={spreadsheet.sheetNames.length === 1}
                label="Worksheet"
                onChange={(sheetName) => {
                  if (sheetName) {
                    setSelectedWorksheet(sheetName);
                  }
                }}
                value={spreadsheet.selectedSheetName}
              />
            )}

            <div className="data-tools">
              <TextInput
                aria-label="Search imported values"
                disabled={!spreadsheet}
                placeholder="Search imported values..."
                leftSection={<IconSearch size={16} />}
                onChange={(event) => setSearchQuery(event.currentTarget.value)}
                value={searchQuery}
              />
              <select
                aria-label="Search columns"
                disabled={sourceColumns.length === 0}
                onChange={(event) => setSearchColumn(event.currentTarget.value)}
                value={activeSearchColumn}
              >
                <option value="all">All columns</option>
                {sourceColumns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.displayName}
                  </option>
                ))}
              </select>
            </div>

            <Group gap="sm">
              <ColumnFilters
                columns={sourceColumns}
                filters={columnFilters}
                onChange={setColumnFilters}
                rows={allRows}
              />
              <ColumnSettings
                columns={sourceColumns}
                onChange={setColumnPreferences}
                preferences={columnPreferences}
              />
            </Group>

            <Group gap="xs">
              <Button
                disabled={matchingRowIds.length === 0}
                onClick={() => selectRows(matchingRowIds)}
                size="compact-sm"
                variant="light"
              >
                Select all matching
              </Button>
              <Button
                disabled={visibleRowIds.length === 0}
                onClick={() => selectRows(visibleRowIds)}
                size="compact-sm"
                variant="default"
              >
                Select visible page
              </Button>
              <Button
                disabled={selectedRowIds.length === 0}
                onClick={clearRowSelection}
                size="compact-sm"
                variant="subtle"
              >
                Clear selection
              </Button>
            </Group>

            <div className="data-table">
              <div
                aria-label="Spreadsheet rows"
                className={
                  shouldVirtualizeRows
                    ? "data-table-scroll data-table-scroll-virtual"
                    : "data-table-scroll"
                }
                ref={dataTableScrollRef}
                role={shouldVirtualizeRows ? "region" : undefined}
                tabIndex={shouldVirtualizeRows ? 0 : undefined}
              >
                <Table
                  aria-rowcount={dataRows.length + 1}
                  striped
                  highlightOnHover
                >
                  <Table.Thead>
                    {dataTable.getHeaderGroups().map((headerGroup) => (
                      <Table.Tr key={headerGroup.id}>
                        <Table.Th
                          aria-label="Row selection"
                          className="data-table-selection"
                        >
                          <Checkbox
                            aria-label="Toggle visible page selection"
                            checked={visibleSelectionState === "all"}
                            disabled={visibleRowIds.length === 0}
                            indeterminate={visibleSelectionState === "some"}
                            onChange={() =>
                              visibleSelectionState === "all"
                                ? deselectRows(visibleRowIds)
                                : selectRows(visibleRowIds)
                            }
                          />
                        </Table.Th>
                        {headerGroup.headers.map((header) => (
                          <Table.Th key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                          </Table.Th>
                        ))}
                        <Table.Th>Row type</Table.Th>
                      </Table.Tr>
                    ))}
                  </Table.Thead>
                  <Table.Tbody>
                    {dataRows.length === 0 ? (
                      <Table.Tr>
                        <Table.Td
                          className="data-table-empty"
                          colSpan={dataColumns.length + 2}
                        >
                          {!spreadsheet
                            ? "Upload a spreadsheet to view its rows."
                            : columnFilters.length > 0 &&
                                debouncedSearchQuery.trim()
                              ? "No rows match your search and filters."
                              : columnFilters.length > 0
                                ? "No rows match your filters."
                                : debouncedSearchQuery.trim()
                                  ? "No rows match your search."
                                  : "This worksheet has no data rows."}
                        </Table.Td>
                      </Table.Tr>
                    ) : shouldVirtualizeRows ? (
                      <>
                        {topSpacerHeight > 0 && (
                          <Table.Tr
                            aria-hidden="true"
                            className="data-table-spacer"
                          >
                            <Table.Td
                              colSpan={dataColumns.length + 2}
                              style={{ height: topSpacerHeight }}
                            />
                          </Table.Tr>
                        )}
                        {virtualRows.map((virtualRow) => (
                          <DataRow
                            columns={visibleColumns}
                            editingManualRowId={editingManualRowId}
                            isEditingSourceRow={
                              editingSourceRowId ===
                              dataRows[virtualRow.index].original.id
                            }
                            isModifiedSourceRow={overriddenRowIds.has(
                              dataRows[virtualRow.index].original.id,
                            )}
                            isSelected={selectedRowIdSet.has(
                              dataRows[virtualRow.index].original.id,
                            )}
                            key={dataRows[virtualRow.index].id}
                            manualRow={manualRowsById.get(
                              dataRows[virtualRow.index].original.id,
                            )}
                            manualRowIndex={manualRowIndexes.get(
                              dataRows[virtualRow.index].original.id,
                            )}
                            onDeleteManualRow={deleteRow}
                            onDuplicateManualRow={duplicateRow}
                            onManualCellChange={changeManualCell}
                            onManualCellPaste={pasteIntoManualCells}
                            onManualEditStarted={() =>
                              setEditingManualRowId(null)
                            }
                            onResetSourceRow={resetSourceRow}
                            onSourceCellChange={changeSourceCell}
                            onStartSourceEdit={startSourceEdit}
                            onStopSourceEdit={() => setEditingSourceRowId(null)}
                            onToggleSelection={toggleRowSelection}
                            row={dataRows[virtualRow.index]}
                            virtualIndex={virtualRow.index}
                          />
                        ))}
                        {bottomSpacerHeight > 0 && (
                          <Table.Tr
                            aria-hidden="true"
                            className="data-table-spacer"
                          >
                            <Table.Td
                              colSpan={dataColumns.length + 2}
                              style={{ height: bottomSpacerHeight }}
                            />
                          </Table.Tr>
                        )}
                      </>
                    ) : (
                      dataRows.map((row) => (
                        <DataRow
                          columns={visibleColumns}
                          editingManualRowId={editingManualRowId}
                          isEditingSourceRow={
                            editingSourceRowId === row.original.id
                          }
                          isModifiedSourceRow={overriddenRowIds.has(
                            row.original.id,
                          )}
                          isSelected={selectedRowIdSet.has(row.original.id)}
                          key={row.id}
                          manualRow={manualRowsById.get(row.original.id)}
                          manualRowIndex={manualRowIndexes.get(row.original.id)}
                          onDeleteManualRow={deleteRow}
                          onDuplicateManualRow={duplicateRow}
                          onManualCellChange={changeManualCell}
                          onManualCellPaste={pasteIntoManualCells}
                          onManualEditStarted={() =>
                            setEditingManualRowId(null)
                          }
                          onResetSourceRow={resetSourceRow}
                          onSourceCellChange={changeSourceCell}
                          onStartSourceEdit={startSourceEdit}
                          onStopSourceEdit={() => setEditingSourceRowId(null)}
                          onToggleSelection={toggleRowSelection}
                          row={row}
                        />
                      ))
                    )}
                  </Table.Tbody>
                </Table>
              </div>
              <Button
                className="add-row"
                disabled={sourceColumns.length === 0}
                variant="subtle"
                fullWidth
                leftSection={<IconPlus />}
                onClick={addManualRow}
              >
                Add row
              </Button>
            </div>

            <Text className="panel-footer" size="sm" c="dimmed">
              {debouncedSearchQuery.trim() || columnFilters.length > 0
                ? `${matchingRows.length} matching · ${allRows.length} total rows`
                : `${allRows.length} total rows`}
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
            <Group gap="sm">
              <Button
                component="label"
                leftSection={<IconFileTypeSvg />}
                loading={isImportingSvg}
                variant="outline"
              >
                Import local SVG
                <input
                  accept=".svg,image/svg+xml"
                  aria-label="Choose an SVG file"
                  hidden
                  onChange={handleSvgFile}
                  type="file"
                />
              </Button>
              {svg && (
                <Badge color="green" variant="light">
                  Sanitized
                </Badge>
              )}
              <Badge
                aria-label={`SVG source status: ${svgSourceStatus.label}`}
                color={svgSourceStatus.color}
                variant="light"
              >
                {svgSourceStatus.label}
              </Badge>
            </Group>
            <Text size="sm" c={svg ? "blue" : "dimmed"} fw={svg ? 600 : 400}>
              {svg ? svg.fileName : "No SVG loaded"}
            </Text>
            <Group align="end" gap="xs" wrap="nowrap">
              <TextInput
                aria-label="HTTPS SVG URL"
                disabled={!project || isReloadingSvg}
                onChange={(event) => setLinkedSvgUrl(event.currentTarget.value)}
                placeholder="https://example.com/template.svg"
                value={linkedSvgUrl}
              />
              <Button
                disabled={!project || !linkedSvgUrl.trim() || isReloadingSvg}
                onClick={() => void linkHttpsSvg()}
                variant="default"
              >
                Link HTTPS
              </Button>
            </Group>
            <TextInput
              aria-label="Search SVG objects"
              disabled={!svg}
              placeholder="Search objects..."
              leftSection={<IconSearch size={16} />}
              onChange={(event) => setSvgSearchQuery(event.currentTarget.value)}
              value={svgSearchQuery}
            />

            {!svg && (
              <div className="empty-state">
                <IconBox size={34} stroke={1.4} />
                <Text fw={600}>No SVG loaded</Text>
                <Text size="sm" c="dimmed" ta="center">
                  Import an SVG to inspect its objects and configure mappings.
                </Text>
              </div>
            )}

            {svg && (
              <Stack gap="xs">
                <Text size="sm" c="dimmed">
                  {svg.targets.length} mapping{" "}
                  {svg.targets.length === 1 ? "target" : "targets"} found
                </Text>
                <SvgObjectTree
                  nodes={svg.tree}
                  onSelect={setSvgObjectSelection}
                  query={svgSearchQuery}
                  selectedId={selectedSvgObjectId}
                  statuses={svgMappingStatuses}
                />
              </Stack>
            )}

            {selectedSvgNode ? (
              <div className="mapping-editor-region">
                <MappingEditor
                  columns={sourceColumns}
                  mapping={selectedMapping}
                  onChange={setMapping}
                  onRemove={() => removeMapping(selectedSvgNode.id)}
                  target={selectedSvgNode}
                />
              </div>
            ) : (
              <div className="mapping-placeholder">
                <Text fw={600}>Mapping configuration</Text>
                <Text size="sm" c="dimmed">
                  Select an SVG object to configure its mapping.
                </Text>
              </div>
            )}
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
                  disabled={activePreviewRowIndex <= 0}
                  onClick={() =>
                    setActiveRow(previewRowIds[activePreviewRowIndex - 1])
                  }
                >
                  Previous
                </Button>
                <Text aria-live="polite" size="sm">
                  {activePreviewRowIndex + 1} / {previewRowIds.length}
                </Text>
                <Button
                  variant="default"
                  rightSection={<IconChevronRight />}
                  disabled={
                    activePreviewRowIndex === -1 ||
                    activePreviewRowIndex === previewRowIds.length - 1
                  }
                  onClick={() =>
                    setActiveRow(previewRowIds[activePreviewRowIndex + 1])
                  }
                >
                  Next
                </Button>
              </Group>
              <Group gap="xs">
                <Text size="sm" c="dimmed">
                  Zoom
                </Text>
                <ActionIcon
                  variant="default"
                  aria-label="Zoom out"
                  disabled={!svg || previewZoomPercent <= MIN_PREVIEW_ZOOM}
                  onClick={() =>
                    setPreviewZoomPercent((zoom) =>
                      Math.max(MIN_PREVIEW_ZOOM, zoom - PREVIEW_ZOOM_STEP),
                    )
                  }
                >
                  <IconMinus />
                </ActionIcon>
                <Text aria-live="polite" size="sm">
                  {previewZoomPercent}%
                </Text>
                <ActionIcon
                  variant="default"
                  aria-label="Zoom in"
                  disabled={!svg || previewZoomPercent >= MAX_PREVIEW_ZOOM}
                  onClick={() =>
                    setPreviewZoomPercent((zoom) =>
                      Math.min(MAX_PREVIEW_ZOOM, zoom + PREVIEW_ZOOM_STEP),
                    )
                  }
                >
                  <IconPlus />
                </ActionIcon>
                <Button
                  variant="default"
                  disabled={!svg || previewZoomPercent === 100}
                  onClick={() => setPreviewZoomPercent(100)}
                >
                  Fit
                </Button>
              </Group>
            </div>

            <div className="preview-canvas">
              {svg ? (
                <SvgPreview
                  acceptedSvg={previewSvg ?? svg.acceptedSvg}
                  selectedTargetId={selectedSvgObjectId}
                  zoomPercent={previewZoomPercent}
                />
              ) : (
                <div className="preview-document">
                  <IconFileTypeSvg size={52} stroke={1.3} />
                  <Text fw={600}>Preview unavailable</Text>
                  <Text size="sm" c="dimmed">
                    Upload an SVG template to begin.
                  </Text>
                </div>
              )}
            </div>
          </Stack>
        </Paper>
      </main>

      <ValidationReportModal
        onClose={() => setValidationReportOpened(false)}
        opened={validationReportOpened}
        result={validationResult}
        rowLabels={validationRowLabels}
      />

      <footer className="action-bar" aria-label="Project actions" role="region">
        <Group gap="sm">
          <Button
            disabled={!svg || selectedRows.length === 0}
            leftSection={<IconEye />}
            onClick={validateSelection}
          >
            Validate
          </Button>
          <Button
            disabled={!project || isSavingProject}
            loading={isSavingProject}
            onClick={() => void saveProject()}
            variant="default"
          >
            Save project
          </Button>
          <Select
            allowDeselect={false}
            aria-label="Export format"
            data={[
              { label: "SVG", value: "svg" },
              { label: "PDF", value: "pdf" },
            ]}
            disabled={isExporting}
            onChange={(value) => {
              if (value === "svg" || value === "pdf") setExportFormat(value);
            }}
            value={exportFormat}
            w={92}
          />
          <TextInput
            aria-label="Filename template"
            disabled={isExporting}
            onChange={(event) => setFilenameTemplate(event.currentTarget.value)}
            placeholder="row-{row}"
            value={filenameTemplate}
            w={180}
          />
          <Select
            allowDeselect={false}
            aria-label="Filename collision policy"
            data={[
              { label: "Append number", value: "suffix" },
              { label: "Error", value: "error" },
            ]}
            disabled={isExporting}
            onChange={(value) => {
              if (value === "suffix" || value === "error") {
                setFilenameCollisionPolicy(value);
              }
            }}
            value={filenameCollisionPolicy}
            w={140}
          />
          <Checkbox
            checked={includeCsv}
            disabled={isExporting}
            label="Include CSV"
            onChange={(event) => setIncludeCsv(event.currentTarget.checked)}
          />
          <Checkbox
            checked={continueOnError}
            disabled={isExporting}
            label="Continue on errors (partial export)"
            onChange={(event) =>
              setContinueOnError(event.currentTarget.checked)
            }
          />
          {failedExportRetry && !isExporting && (
            <Button onClick={() => void retryFailedRows()} variant="default">
              Retry failed ({failedExportRetry.rowIds.length})
            </Button>
          )}
          <Button
            disabled={!svg || selectedRows.length === 0}
            leftSection={<IconDownload />}
            loading={isExporting}
            onClick={() =>
              void exportRows(
                selectedRows,
                {
                  format: exportFormat,
                  includeCsv,
                  filenameTemplate,
                  collisionPolicy: filenameCollisionPolicy,
                },
                continueOnError,
              )
            }
          >
            Export selected
          </Button>
          {isExporting && (
            <Button
              color="red"
              onClick={() => {
                cancelExportRef.current = true;
              }}
              variant="light"
            >
              Cancel export
            </Button>
          )}
        </Group>
        {isExporting && exportProgress && (
          <Group gap="xs" wrap="nowrap">
            <Progress
              aria-label="Export progress"
              value={
                exportProgress.total === 0
                  ? 0
                  : (exportProgress.completed / exportProgress.total) * 100
              }
              w={140}
            />
            <Text aria-live="polite" size="sm">
              {exportProgress.completed}/{exportProgress.total}
              {exportProgress.currentFilename
                ? ` · ${exportProgress.currentFilename}`
                : ""}
            </Text>
          </Group>
        )}
        <Text aria-live="polite" size="sm" c="dimmed">
          {selectedRowIds.length} {selectedRowIds.length === 1 ? "row" : "rows"}{" "}
          selected ·{" "}
          {validationResult
            ? validationResult.issues.length === 0
              ? "Validated, no issues"
              : `Validated, ${validationResult.issues.length} ${
                  validationResult.issues.length === 1 ? "issue" : "issues"
                }`
            : "Not validated"}
        </Text>
      </footer>
    </div>
  );
}
