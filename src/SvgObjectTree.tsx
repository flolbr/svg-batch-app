import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import type { SvgTreeNode } from "./svg/buildSvgTree";
import classes from "./SvgObjectTree.module.css";

type SvgObjectTreeProps = {
  nodes: SvgTreeNode[];
  query: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

type VisibleNode = SvgTreeNode & {
  level: number;
  parentId: string | null;
  hasVisibleChildren: boolean;
};

function normalized(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}

function branchIds(nodes: SvgTreeNode[]): string[] {
  return nodes.flatMap((node) => [
    ...(node.children.length > 0 ? [node.id] : []),
    ...branchIds(node.children),
  ]);
}

function filterNodes(nodes: SvgTreeNode[], query: string): SvgTreeNode[] {
  if (!query) return nodes;

  return nodes.flatMap((node) => {
    const children = filterNodes(node.children, query);
    const matches = normalized(
      `${node.label} ${node.id} ${node.tagName}`,
    ).includes(query);

    return matches || children.length > 0 ? [{ ...node, children }] : [];
  });
}

function flattenNodes(
  nodes: SvgTreeNode[],
  expanded: Set<string>,
  level = 1,
  parentId: string | null = null,
): VisibleNode[] {
  return nodes.flatMap((node) => {
    const hasVisibleChildren = node.children.length > 0;
    const item: VisibleNode = { ...node, level, parentId, hasVisibleChildren };
    return hasVisibleChildren && expanded.has(node.id)
      ? [item, ...flattenNodes(node.children, expanded, level + 1, node.id)]
      : [item];
  });
}

export function SvgObjectTree({
  nodes,
  query,
  selectedId,
  onSelect,
}: SvgObjectTreeProps) {
  const [expandedIds, setExpandedIds] = useState(
    () => new Set(branchIds(nodes)),
  );
  const [focusedId, setFocusedId] = useState<string | null>(
    () => selectedId ?? nodes[0]?.id ?? null,
  );
  const itemRefs = useRef(new Map<string, HTMLDivElement>());
  const normalizedQuery = normalized(query.trim());

  useEffect(() => {
    setExpandedIds((current) => new Set([...current, ...branchIds(nodes)]));
  }, [nodes]);

  const filteredNodes = useMemo(
    () => filterNodes(nodes, normalizedQuery),
    [nodes, normalizedQuery],
  );
  const forcedExpandedIds = useMemo(
    () => new Set(branchIds(filteredNodes)),
    [filteredNodes],
  );
  const visibleNodes = useMemo(() => {
    const expanded = normalizedQuery
      ? new Set([...expandedIds, ...forcedExpandedIds])
      : expandedIds;
    return flattenNodes(filteredNodes, expanded);
  }, [expandedIds, filteredNodes, forcedExpandedIds, normalizedQuery]);
  const activeId = visibleNodes.some((node) => node.id === focusedId)
    ? focusedId
    : (visibleNodes[0]?.id ?? null);

  useLayoutEffect(() => {
    if (activeId && focusedId !== activeId) setFocusedId(activeId);
  }, [activeId, focusedId]);

  useLayoutEffect(() => {
    if (focusedId && selectedId === focusedId)
      itemRefs.current.get(focusedId)?.focus();
  }, [focusedId, selectedId]);

  function toggle(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function focusItem(id: string) {
    setFocusedId(id);
    itemRefs.current.get(id)?.focus();
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLDivElement>,
    node: VisibleNode,
  ) {
    const index = visibleNodes.findIndex((item) => item.id === node.id);

    if (event.key === "Enter") {
      event.preventDefault();
      onSelect(node.id);
    } else if (event.key === "ArrowDown" && visibleNodes[index + 1]) {
      event.preventDefault();
      focusItem(visibleNodes[index + 1].id);
    } else if (event.key === "ArrowUp" && visibleNodes[index - 1]) {
      event.preventDefault();
      focusItem(visibleNodes[index - 1].id);
    } else if (event.key === "ArrowRight" && node.hasVisibleChildren) {
      event.preventDefault();
      if (!expandedIds.has(node.id) && !normalizedQuery) toggle(node.id);
      else if (visibleNodes[index + 1]) focusItem(visibleNodes[index + 1].id);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (
        node.hasVisibleChildren &&
        expandedIds.has(node.id) &&
        !normalizedQuery
      ) {
        toggle(node.id);
      } else if (node.parentId) {
        focusItem(node.parentId);
      }
    }
  }

  if (nodes.length === 0 || (normalizedQuery && filteredNodes.length === 0)) {
    return (
      <p className={classes.empty} role="status">
        No SVG objects match your search.
      </p>
    );
  }

  function renderNodes(treeNodes: SvgTreeNode[], level = 1): ReactNode {
    return treeNodes.map((node) => {
      const visibleNode = visibleNodes.find((item) => item.id === node.id)!;
      const isExpanded = expandedIds.has(node.id) || Boolean(normalizedQuery);

      return (
        <div key={node.id}>
          <div
            aria-expanded={
              visibleNode.hasVisibleChildren ? isExpanded : undefined
            }
            aria-level={level}
            aria-selected={selectedId === node.id}
            className={classes.item}
            onClick={() => onSelect(node.id)}
            onFocus={() => setFocusedId(node.id)}
            onKeyDown={(event) => handleKeyDown(event, visibleNode)}
            ref={(element) => {
              if (element) itemRefs.current.set(node.id, element);
              else itemRefs.current.delete(node.id);
            }}
            role="treeitem"
            tabIndex={activeId === node.id ? 0 : -1}
          >
            {visibleNode.hasVisibleChildren ? (
              <button
                aria-label={`${isExpanded ? "Collapse" : "Expand"} ${node.label}`}
                className={classes.toggle}
                onClick={(event) => {
                  event.stopPropagation();
                  toggle(node.id);
                  focusItem(node.id);
                }}
                tabIndex={-1}
                type="button"
              >
                {isExpanded ? "−" : "+"}
              </button>
            ) : (
              <span aria-hidden="true" className={classes.spacer} />
            )}
            <span className={classes.label}>{node.label}</span>
            <span className={classes.tag}>{node.tagName}</span>
            <span className={classes.status}>Unmapped</span>
          </div>
          {visibleNode.hasVisibleChildren && isExpanded && (
            <div className={classes.group} role="group">
              {renderNodes(node.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  }

  return (
    <div aria-label="SVG object tree" className={classes.tree} role="tree">
      {renderNodes(filteredNodes)}
    </div>
  );
}
