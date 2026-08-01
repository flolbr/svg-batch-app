import { create } from "zustand";
import {
  createColumnPreferences,
  type ColumnPreferences,
} from "./data/columnPreferences";
import type { ColumnFilter } from "./data/filterRows";
import type { ImportedSpreadsheet } from "./data/importSpreadsheet";
import type { ManualRow } from "./data/manualRows";
import {
  normalizeWorksheet,
  type CellValue,
  type NormalizedWorksheet,
  type RowId,
} from "./data/normalizeWorkbook";
import {
  deselectRows,
  selectRows,
  toggleSelectedRow,
} from "./data/rowSelection";
import type { RowOverride } from "./data/rowOverrides";
import type { Mapping, Mappings } from "./mappings/schema";
import type { DataProjectState } from "./project/dataProjectState";
import type {
  Project,
  PersistedSourceReference,
} from "./project/projectSchema";
import { restoreImportedSvg, type ImportedSvg } from "./svg/importSvg";

export type PanelWeights = [number, number, number];
export type SpreadsheetSource = Omit<ImportedSpreadsheet, "workbook"> & {
  columnPreferencesBySheet: Record<string, ColumnPreferences>;
  columnFiltersBySheet: Record<string, ColumnFilter[]>;
  data: NormalizedWorksheet;
  manualRowsBySheet: Record<string, ManualRow[]>;
  normalizedDataBySheet: Record<string, NormalizedWorksheet>;
  rowOverridesBySheet: Record<string, RowOverride[]>;
  selectedRowIdsBySheet: Record<string, RowId[]>;
  selectedSheetName: string;
  workbook?: ImportedSpreadsheet["workbook"];
};

type AppStore = {
  mappings: Mappings;
  project: Project | null;
  ui: {
    panelWeights: PanelWeights;
  };
  sources: {
    spreadsheet: SpreadsheetSource | null;
    svg: ImportedSvg | null;
    previousTemplate?: {
      svg: ImportedSvg;
      mappings: Mappings;
      project: Project | null;
      svgObjectId: string | null;
    } | null;
  };
  selection: {
    activeRowId: string | null;
    selectedRowIds: string[];
    svgObjectId: string | null;
  };
  setProject: (project: Project) => void;
  setPanelWeights: (panelWeights: PanelWeights) => void;
  setSelectedWorksheet: (sheetName: string) => void;
  setManualRows: (rows: ManualRow[]) => void;
  setMapping: (mapping: Mapping) => void;
  setColumnFilters: (filters: ColumnFilter[]) => void;
  setColumnPreferences: (preferences: ColumnPreferences) => void;
  setRowOverrides: (overrides: RowOverride[]) => void;
  setSpreadsheetSource: (spreadsheet: ImportedSpreadsheet) => void;
  setSvgSource: (svg: ImportedSvg) => void;
  applyLinkedSvgUpdate: (input: {
    svg: ImportedSvg;
    mappings: Mappings;
    source: PersistedSourceReference;
    oldHash?: string;
    newHash: string;
    missingTargetIds: string[];
  }) => void;
  undoTemplateUpdate: () => void;
  clearTemplateUpdateUndo: () => void;
  removeMapping: (targetId: string) => void;
  setSvgObjectSelection: (id: string | null) => void;
  setActiveRow: (rowId: RowId | null) => void;
  clearRowSelection: () => void;
  deselectRows: (rowIds: RowId[]) => void;
  selectRows: (rowIds: RowId[]) => void;
  toggleRowSelection: (rowId: RowId) => void;
};

export const initialPanelWeights: PanelWeights = [38, 27, 35];

function getProjectData(spreadsheet: SpreadsheetSource): DataProjectState {
  return {
    fileName: spreadsheet.fileName,
    fileSize: spreadsheet.fileSize,
    sheetNames: spreadsheet.sheetNames,
    selectedSheetName: spreadsheet.selectedSheetName,
    worksheets: Object.fromEntries(
      spreadsheet.sheetNames.map((sheetName) => [
        sheetName,
        {
          data: spreadsheet.normalizedDataBySheet[sheetName],
          selectedRowIds: spreadsheet.selectedRowIdsBySheet[sheetName] ?? [],
          filters: spreadsheet.columnFiltersBySheet[sheetName] ?? [],
          rowOverrides: (spreadsheet.rowOverridesBySheet[sheetName] ?? []).map(
            (override) => ({
              rowId: override.rowId,
              values: Object.fromEntries(
                Object.entries(override.values).filter(
                  (entry): entry is [string, CellValue] =>
                    entry[1] !== undefined,
                ),
              ),
            }),
          ),
          manualRows: spreadsheet.manualRowsBySheet[sheetName] ?? [],
          columnPreferences:
            spreadsheet.columnPreferencesBySheet[sheetName] ??
            createColumnPreferences(
              spreadsheet.normalizedDataBySheet[sheetName].columns.map(
                (column) => column.id,
              ),
            ),
        },
      ]),
    ),
  };
}

function restoreSpreadsheet(data: DataProjectState): SpreadsheetSource {
  return {
    fileName: data.fileName,
    fileSize: data.fileSize,
    sheetNames: data.sheetNames,
    selectedSheetName: data.selectedSheetName,
    data: data.worksheets[data.selectedSheetName].data,
    normalizedDataBySheet: Object.fromEntries(
      data.sheetNames.map((sheetName) => [
        sheetName,
        data.worksheets[sheetName].data,
      ]),
    ),
    selectedRowIdsBySheet: Object.fromEntries(
      data.sheetNames.map((sheetName) => [
        sheetName,
        data.worksheets[sheetName].selectedRowIds,
      ]),
    ),
    columnFiltersBySheet: Object.fromEntries(
      data.sheetNames.map((sheetName) => [
        sheetName,
        data.worksheets[sheetName].filters,
      ]),
    ),
    rowOverridesBySheet: Object.fromEntries(
      data.sheetNames.map((sheetName) => [
        sheetName,
        data.worksheets[sheetName].rowOverrides,
      ]),
    ),
    manualRowsBySheet: Object.fromEntries(
      data.sheetNames.map((sheetName) => [
        sheetName,
        data.worksheets[sheetName].manualRows,
      ]),
    ),
    columnPreferencesBySheet: Object.fromEntries(
      data.sheetNames.map((sheetName) => [
        sheetName,
        data.worksheets[sheetName].columnPreferences,
      ]),
    ),
  };
}

function spreadsheetState(
  state: AppStore,
  spreadsheet: SpreadsheetSource,
  selectedRowIds = state.selection.selectedRowIds,
) {
  return {
    project: state.project
      ? { ...state.project, data: getProjectData(spreadsheet) }
      : null,
    selection: {
      ...state.selection,
      activeRowId: reconciledActiveRowId(
        state.selection.activeRowId,
        selectedRowIds,
      ),
      selectedRowIds,
    },
    sources: {
      ...state.sources,
      spreadsheet,
    },
  };
}

function reconciledActiveRowId(
  activeRowId: RowId | null,
  selectedRowIds: RowId[],
): RowId | null {
  if (activeRowId && selectedRowIds.includes(activeRowId)) {
    return activeRowId;
  }

  return selectedRowIds[0] ?? null;
}

function selectedRowsState(state: AppStore, selectedRowIds: RowId[]) {
  const spreadsheet = state.sources.spreadsheet;
  if (!spreadsheet) {
    return {
      selection: {
        ...state.selection,
        activeRowId: reconciledActiveRowId(
          state.selection.activeRowId,
          selectedRowIds,
        ),
        selectedRowIds,
      },
    };
  }

  return spreadsheetState(
    state,
    {
      ...spreadsheet,
      selectedRowIdsBySheet: {
        ...spreadsheet.selectedRowIdsBySheet,
        [spreadsheet.selectedSheetName]: selectedRowIds,
      },
    },
    selectedRowIds,
  );
}

export const useAppStore = create<AppStore>()((set) => ({
  mappings: [],
  project: null,
  ui: {
    panelWeights: initialPanelWeights,
  },
  sources: {
    spreadsheet: null,
    svg: null,
  },
  selection: {
    activeRowId: null,
    selectedRowIds: [],
    svgObjectId: null,
  },
  setProject: (project) =>
    set((state) => {
      const spreadsheet = project.data
        ? restoreSpreadsheet(project.data)
        : null;
      const svg = project.template
        ? restoreImportedSvg(project.template)
        : null;
      const selectedRowIds = spreadsheet
        ? (spreadsheet.selectedRowIdsBySheet[spreadsheet.selectedSheetName] ??
          [])
        : [];
      const svgObjectId =
        project.template?.selectedObjectId &&
        svg?.targets.some(
          (target) => target.id === project.template?.selectedObjectId,
        )
          ? project.template.selectedObjectId
          : null;
      return {
        mappings: project.mappings,
        project,
        sources: {
          spreadsheet,
          svg,
        },
        selection: {
          ...state.selection,
          activeRowId: reconciledActiveRowId(
            state.selection.activeRowId,
            selectedRowIds,
          ),
          selectedRowIds,
          svgObjectId,
        },
      };
    }),
  setSelectedWorksheet: (sheetName) =>
    set((state) => {
      const spreadsheet = state.sources.spreadsheet;
      if (
        !spreadsheet?.sheetNames.includes(sheetName) ||
        spreadsheet.selectedSheetName === sheetName
      ) {
        return state;
      }

      const data = spreadsheet.normalizedDataBySheet[sheetName];
      if (!data) return state;

      return spreadsheetState(
        state,
        {
          ...spreadsheet,
          data,
          selectedSheetName: sheetName,
        },
        spreadsheet.selectedRowIdsBySheet[sheetName] ?? [],
      );
    }),
  setSpreadsheetSource: (spreadsheet) =>
    set((state) => {
      const selectedSheetName = spreadsheet.sheetNames[0];
      const normalizedDataBySheet = Object.fromEntries(
        spreadsheet.sheetNames.map((sheetName) => [
          sheetName,
          normalizeWorksheet(spreadsheet.workbook.Sheets[sheetName] ?? {}),
        ]),
      );
      const data = normalizedDataBySheet[selectedSheetName];
      const columnPreferencesBySheet = Object.fromEntries(
        spreadsheet.sheetNames.map((sheetName) => [
          sheetName,
          createColumnPreferences(
            normalizedDataBySheet[sheetName].columns.map((column) => column.id),
          ),
        ]),
      );
      return spreadsheetState(
        state,
        {
          ...spreadsheet,
          columnFiltersBySheet: {},
          columnPreferencesBySheet,
          data,
          manualRowsBySheet: {},
          normalizedDataBySheet,
          rowOverridesBySheet: {},
          selectedRowIdsBySheet: {},
          selectedSheetName,
        },
        [],
      );
    }),
  setSvgSource: (svg) =>
    set((state) => {
      const { previousTemplate: _previousTemplate, ...sources } = state.sources;
      return {
        mappings: [],
        selection: { ...state.selection, svgObjectId: null },
        sources: { ...sources, svg },
      };
    }),
  applyLinkedSvgUpdate: ({
    svg,
    mappings,
    source,
    oldHash,
    newHash,
    missingTargetIds,
  }) =>
    set((state) => {
      const project = state.project;
      const audit = project ? { ...project.audit } : null;
      if (audit && !oldHash) delete audit.lastTemplateUpdate;
      const updatedProject = project
        ? {
            ...project,
            sources: [
              ...project.sources.filter(
                (candidate) => candidate.kind !== "svg",
              ),
              source,
            ],
            audit: {
              ...audit!,
              templateHash: newHash,
              ...(oldHash
                ? {
                    lastTemplateUpdate: {
                      oldHash,
                      newHash,
                      updatedAt: new Date().toISOString(),
                      missingTargetIds,
                    },
                  }
                : {}),
            },
          }
        : null;
      return {
        mappings,
        project: updatedProject,
        selection: { ...state.selection, svgObjectId: null },
        sources: {
          ...state.sources,
          svg,
          previousTemplate: state.sources.svg
            ? {
                svg: state.sources.svg,
                mappings: state.mappings,
                project: state.project,
                svgObjectId: state.selection.svgObjectId,
              }
            : null,
        },
      };
    }),
  undoTemplateUpdate: () =>
    set((state) => {
      const previous = state.sources.previousTemplate;
      if (!previous) return state;
      return {
        mappings: previous.mappings,
        project: previous.project,
        selection: { ...state.selection, svgObjectId: previous.svgObjectId },
        sources: (() => {
          const { previousTemplate: _previousTemplate, ...sources } =
            state.sources;
          return { ...sources, svg: previous.svg };
        })(),
      };
    }),
  clearTemplateUpdateUndo: () =>
    set((state) => {
      const { previousTemplate: _previousTemplate, ...sources } = state.sources;
      return { sources };
    }),
  setMapping: (mapping) =>
    set((state) => {
      const existingIndex = state.mappings.findIndex(
        (candidate) => candidate.targetId === mapping.targetId,
      );
      if (existingIndex === -1) {
        return { mappings: [...state.mappings, mapping] };
      }

      const mappings = [...state.mappings];
      mappings[existingIndex] = mapping;
      return { mappings };
    }),
  removeMapping: (targetId) =>
    set((state) => ({
      mappings: state.mappings.filter(
        (mapping) => mapping.targetId !== targetId,
      ),
    })),
  setSvgObjectSelection: (svgObjectId) =>
    set((state) => ({
      selection: {
        ...state.selection,
        svgObjectId,
      },
    })),
  setActiveRow: (rowId) =>
    set((state) => ({
      selection: {
        ...state.selection,
        activeRowId: reconciledActiveRowId(
          rowId,
          state.selection.selectedRowIds,
        ),
      },
    })),
  setColumnFilters: (filters) =>
    set((state) => {
      const spreadsheet = state.sources.spreadsheet;
      if (!spreadsheet) return state;

      return spreadsheetState(state, {
        ...spreadsheet,
        columnFiltersBySheet: {
          ...spreadsheet.columnFiltersBySheet,
          [spreadsheet.selectedSheetName]: filters,
        },
      });
    }),
  setColumnPreferences: (preferences) =>
    set((state) => {
      const spreadsheet = state.sources.spreadsheet;
      if (!spreadsheet) return state;

      return spreadsheetState(state, {
        ...spreadsheet,
        columnPreferencesBySheet: {
          ...spreadsheet.columnPreferencesBySheet,
          [spreadsheet.selectedSheetName]: preferences,
        },
      });
    }),
  setManualRows: (rows) =>
    set((state) => {
      const spreadsheet = state.sources.spreadsheet;
      if (!spreadsheet) return state;

      return spreadsheetState(state, {
        ...spreadsheet,
        manualRowsBySheet: {
          ...spreadsheet.manualRowsBySheet,
          [spreadsheet.selectedSheetName]: rows,
        },
      });
    }),
  setRowOverrides: (overrides) =>
    set((state) => {
      const spreadsheet = state.sources.spreadsheet;
      if (!spreadsheet) return state;

      return spreadsheetState(state, {
        ...spreadsheet,
        rowOverridesBySheet: {
          ...spreadsheet.rowOverridesBySheet,
          [spreadsheet.selectedSheetName]: overrides,
        },
      });
    }),
  clearRowSelection: () => set((state) => selectedRowsState(state, [])),
  deselectRows: (rowIds) =>
    set((state) =>
      selectedRowsState(
        state,
        deselectRows(state.selection.selectedRowIds, rowIds),
      ),
    ),
  selectRows: (rowIds) =>
    set((state) =>
      selectedRowsState(
        state,
        selectRows(state.selection.selectedRowIds, rowIds),
      ),
    ),
  toggleRowSelection: (rowId) =>
    set((state) =>
      selectedRowsState(
        state,
        toggleSelectedRow(state.selection.selectedRowIds, rowId),
      ),
    ),
  setPanelWeights: (panelWeights) =>
    set((state) => ({
      ui: {
        ...state.ui,
        panelWeights,
      },
    })),
}));
