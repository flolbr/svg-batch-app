import userEvent from "@testing-library/user-event";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SvgObjectTree } from "./SvgObjectTree";
import type { SvgTreeNode } from "./svg/buildSvgTree";

const nodes: SvgTreeNode[] = [
  {
    id: "card",
    label: "Carte été",
    tagName: "g",
    children: [
      { id: "name", label: "Name", tagName: "text", children: [] },
      {
        id: "details",
        label: "Details",
        tagName: "g",
        children: [
          { id: "city", label: "City", tagName: "text", children: [] },
        ],
      },
    ],
  },
  { id: "logo", label: "Logo", tagName: "path", children: [] },
];

describe("SvgObjectTree", () => {
  afterEach(cleanup);

  it("renders the expanded hierarchy with tree roles and unmapped status", () => {
    render(
      <SvgObjectTree
        nodes={nodes}
        onSelect={vi.fn()}
        query=""
        selectedId={null}
      />,
    );

    expect(
      screen.getByRole("tree", { name: "SVG object tree" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("treeitem")).toHaveLength(5);
    expect(screen.getAllByRole("group")).toHaveLength(2);
    expect(screen.getAllByText("Unmapped")).toHaveLength(5);
    expect(screen.getByRole("treeitem", { name: /Carte été/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByText("City").closest("[role=treeitem]")).toHaveAttribute(
      "aria-level",
      "3",
    );
  });

  it("collapses branches and selects items by click or Enter", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <SvgObjectTree
        nodes={nodes}
        onSelect={onSelect}
        query=""
        selectedId={null}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Collapse Carte été" }),
    );
    expect(screen.queryByText("Name")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Expand Carte été" }),
    ).toBeInTheDocument();

    await user.click(screen.getByText("Logo"));
    expect(onSelect).toHaveBeenLastCalledWith("logo");
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenLastCalledWith("logo");
  });

  it("keeps matching ancestors and ignores case and accents in search", () => {
    const { rerender } = render(
      <SvgObjectTree
        nodes={nodes}
        onSelect={vi.fn()}
        query="ete"
        selectedId={null}
      />,
    );
    expect(screen.getByText("Carte été")).toBeInTheDocument();
    expect(screen.queryByText("Name")).not.toBeInTheDocument();

    rerender(
      <SvgObjectTree
        nodes={nodes}
        onSelect={vi.fn()}
        query="CITY"
        selectedId={null}
      />,
    );
    expect(screen.getByText("Carte été")).toBeInTheDocument();
    expect(screen.getByText("Details")).toBeInTheDocument();
    expect(screen.getByText("City")).toBeInTheDocument();
    expect(screen.queryByText("Logo")).not.toBeInTheDocument();

    rerender(
      <SvgObjectTree
        nodes={nodes}
        onSelect={vi.fn()}
        query="missing"
        selectedId={null}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "No SVG objects match",
    );
  });

  it("uses roving focus and navigates visible nodes with arrow keys", async () => {
    const user = userEvent.setup();
    render(
      <SvgObjectTree
        nodes={nodes}
        onSelect={vi.fn()}
        query=""
        selectedId={null}
      />,
    );

    const card = screen.getByRole("treeitem", { name: /Carte été/ });
    card.focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("treeitem", { name: /Name/ })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("treeitem", { name: /Details/ })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("treeitem", { name: /City/ })).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("treeitem", { name: /Details/ })).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.queryByText("City")).not.toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: /Details/ })).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("treeitem", { name: /Name/ })).toHaveFocus();
  });
});
