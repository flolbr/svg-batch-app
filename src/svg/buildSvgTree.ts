import { validateSvgTargets } from "./validateSvgTargets";

export type SvgTreeNode = {
  id: string;
  label: string;
  tagName: string;
  children: SvgTreeNode[];
};

const inkscapeNamespace = "http://www.inkscape.org/namespaces/inkscape";

function firstLabel(...values: Array<string | null>): string | undefined {
  return values.map((value) => value?.trim()).find(Boolean);
}

function labelFor(element: Element, id: string, tagName: string): string {
  const title = Array.from(element.children).find(
    (child) => child.localName.toLowerCase() === "title",
  );

  return (
    firstLabel(
      element.getAttributeNS(inkscapeNamespace, "label"),
      element.getAttribute("inkscape:label"),
      element.getAttribute("aria-label"),
      title?.textContent ?? null,
      id,
      tagName,
    ) ?? tagName
  );
}

export function buildSvgTree(source: string): SvgTreeNode[] {
  const targets = validateSvgTargets(source);
  const targetsById = new Map(targets.map((target) => [target.id, target]));
  const document = new DOMParser().parseFromString(source, "image/svg+xml");
  const roots: SvgTreeNode[] = [];
  const nodesById = new Map<string, SvgTreeNode>();

  for (const element of Array.from(document.getElementsByTagName("*"))) {
    const id = element.getAttribute("id");
    if (!id || !targetsById.has(id)) continue;

    const target = targetsById.get(id)!;
    const node: SvgTreeNode = {
      id,
      label: labelFor(element, id, target.tagName),
      tagName: target.tagName,
      children: [],
    };
    nodesById.set(id, node);

    let ancestor = element.parentElement;
    while (ancestor) {
      const ancestorId = ancestor.getAttribute("id");
      if (ancestorId && nodesById.has(ancestorId)) {
        nodesById.get(ancestorId)!.children.push(node);
        break;
      }
      ancestor = ancestor.parentElement;
    }

    if (!ancestor) roots.push(node);
  }

  return roots;
}
