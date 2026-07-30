import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MappingEditor } from "./MappingEditor";
import type { DataColumn } from "./data/normalizeWorkbook";
import type { Mapping, TextMapping } from "./mappings/schema";

const columns: DataColumn[] = [
  {
    id: "name",
    sourceHeader: "Name",
    displayName: "Name",
    sourceIndex: 0,
    inferredType: "text",
  },
  {
    id: "plan",
    sourceHeader: "Plan",
    displayName: "Plan",
    sourceIndex: 1,
    inferredType: "text",
  },
];

const target = { id: "label", label: "Member label", tagName: "text" };

function textMapping(overrides: Partial<TextMapping> = {}): TextMapping {
  return {
    id: "mapping-label",
    targetId: "label",
    columnId: "name",
    type: "text",
    fit: "keep",
    ...overrides,
  };
}

async function choose(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  option: string,
) {
  await user.click(field(label));
  fireEvent.click(screen.getByRole("option", { name: option, hidden: true }));
}

function field(label: string): HTMLInputElement {
  return screen
    .getAllByLabelText(label)
    .find(
      (element): element is HTMLInputElement =>
        element instanceof HTMLInputElement,
    )!;
}

function renderEditor(component: ReactNode) {
  return render(<MantineProvider>{component}</MantineProvider>);
}

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe("MappingEditor", () => {
  afterEach(() => {
    cleanup();
    document
      .querySelectorAll("[data-mantine-shared-portal-node]")
      .forEach((node) => node.remove());
  });

  beforeEach(() => {
    Object.defineProperty(globalThis, "ResizeObserver", {
      configurable: true,
      value: ResizeObserverMock,
      writable: true,
    });
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value() {},
      writable: true,
    });
  });

  it("disables mapping creation without spreadsheet columns", () => {
    renderEditor(
      <MappingEditor
        target={target}
        columns={[]}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(field("Mapping type")).toBeDisabled();
    expect(field("Spreadsheet column")).toBeDisabled();
    expect(
      screen.getByText(/Import or select spreadsheet data/),
    ).toBeInTheDocument();
  });

  it("creates valid defaults and changes the selected column", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = renderEditor(
      <MappingEditor
        target={target}
        columns={columns}
        onChange={onChange}
        onRemove={vi.fn()}
      />,
    );

    await choose(user, "Mapping type", "Text");
    expect(onChange).toHaveBeenLastCalledWith({
      id: "mapping-label",
      targetId: "label",
      columnId: "name",
      type: "text",
      fit: "keep",
      required: undefined,
    });

    rerender(
      <MantineProvider>
        <MappingEditor
          target={target}
          columns={columns}
          mapping={textMapping()}
          onChange={onChange}
          onRemove={vi.fn()}
        />
      </MantineProvider>,
    );
    await choose(user, "Spreadsheet column", "Plan");
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ columnId: "plan" }),
    );
  });

  it("restricts types and replaces options when the mapping type changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderEditor(
      <MappingEditor
        target={target}
        columns={columns}
        mapping={textMapping({ required: true })}
        onChange={onChange}
        onRemove={vi.fn()}
      />,
    );

    await user.click(field("Mapping type"));
    expect(
      screen.getByRole("option", { name: "Visibility", hidden: true }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "QR code", hidden: true }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole("option", { name: "Visibility", hidden: true }),
    );
    expect(onChange).toHaveBeenLastCalledWith({
      id: "mapping-label",
      targetId: "label",
      columnId: "name",
      required: true,
      type: "visibility",
      trueValues: ["yes", "true", "1"],
      falseValues: ["no", "false", "0"],
      emptyBehavior: "error",
    });
  });

  it("updates type-specific values and required state", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const visibility: Mapping = {
      id: "mapping-label",
      targetId: "label",
      columnId: "name",
      type: "visibility",
      trueValues: ["yes"],
      falseValues: ["no"],
      emptyBehavior: "error",
    };
    renderEditor(
      <MappingEditor
        target={target}
        columns={columns}
        mapping={visibility}
        onChange={onChange}
        onRemove={vi.fn()}
      />,
    );

    await user.clear(field("True values"));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ trueValues: [] }),
    );
    await user.click(screen.getByLabelText("Required"));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ required: true }),
    );
  });

  it.each([
    {
      mapping: {
        id: "mapping-group",
        targetId: "group",
        columnId: "name",
        type: "exclusive-group",
        match: "data-option",
        emptyBehavior: "error",
      } satisfies Mapping,
      labels: ["Match", "Empty behavior"],
      target: { id: "group", label: "Options", tagName: "g" },
    },
    {
      mapping: {
        id: "mapping-code",
        targetId: "code",
        columnId: "name",
        type: "qr",
        errorCorrection: "M",
        marginModules: 4,
        emptyBehavior: "error",
      } satisfies Mapping,
      labels: ["Error correction", "Margin modules", "Empty behavior"],
      target: { id: "code", label: "Code", tagName: "g" },
    },
    {
      mapping: {
        id: "mapping-photo",
        targetId: "photo",
        columnId: "name",
        type: "image",
        fit: "contain",
        emptyBehavior: "error",
      } satisfies Mapping,
      labels: ["Image fit", "Empty behavior"],
      target: { id: "photo", label: "Photo", tagName: "image" },
    },
  ])("renders the $mapping.type options", ({ labels, mapping, target }) => {
    renderEditor(
      <MappingEditor
        target={target}
        columns={columns}
        mapping={mapping}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    labels.forEach((label) => {
      expect(field(label)).toBeInTheDocument();
    });
  });

  it("shows the first schema issue for an invalid controlled mapping", () => {
    renderEditor(
      <MappingEditor
        target={target}
        columns={columns}
        mapping={{ ...textMapping(), fit: "shrink", minFontSize: 0 }}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByRole("status")).not.toBeEmptyDOMElement();
  });

  it("reports a mapping column that is absent from the active worksheet", () => {
    renderEditor(
      <MappingEditor
        target={target}
        columns={[columns[0]]}
        mapping={textMapping({ columnId: "plan" })}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Spreadsheet column is unavailable",
    );
    expect(screen.queryByText("Mapping configured.")).not.toBeInTheDocument();
  });

  it("shows removal only for existing mappings", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const { rerender } = renderEditor(
      <MappingEditor
        target={target}
        columns={columns}
        onChange={vi.fn()}
        onRemove={onRemove}
      />,
    );
    expect(screen.queryByRole("button", { name: "Remove mapping" })).toBeNull();

    rerender(
      <MantineProvider>
        <MappingEditor
          target={target}
          columns={columns}
          mapping={textMapping()}
          onChange={vi.fn()}
          onRemove={onRemove}
        />
      </MantineProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Remove mapping" }));
    expect(onRemove).toHaveBeenCalledOnce();
  });
});
