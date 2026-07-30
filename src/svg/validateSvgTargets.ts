const addressableTags = new Set([
  "g",
  "text",
  "tspan",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "image",
  "use",
]);
const resourceContainers = new Set([
  "defs",
  "clippath",
  "mask",
  "lineargradient",
  "radialgradient",
  "symbol",
]);

export type SvgTarget = {
  id: string;
  tagName: string;
};

function validationError(message: string): Error {
  return new Error(`SVG target validation failed: ${message}`);
}

function parseSvg(source: string): XMLDocument {
  const document = new DOMParser().parseFromString(source, "image/svg+xml");
  if (
    document.documentElement.localName.toLowerCase() === "parsererror" ||
    document.getElementsByTagName("parsererror").length > 0
  ) {
    throw validationError("the SVG is not well-formed XML");
  }

  const root = document.documentElement;
  if (
    root.localName.toLowerCase() !== "svg" ||
    root.namespaceURI !== "http://www.w3.org/2000/svg"
  ) {
    throw validationError("the document root must be an SVG element");
  }

  return document;
}

function isInsideResource(element: Element): boolean {
  let ancestor = element.parentElement;
  while (ancestor) {
    if (resourceContainers.has(ancestor.localName.toLowerCase())) return true;
    ancestor = ancestor.parentElement;
  }
  return false;
}

export function validateSvgTargets(source: string): SvgTarget[] {
  const document = parseSvg(source);
  const elements = Array.from(document.getElementsByTagName("*"));
  const ids = new Set<string>();

  for (const element of elements) {
    if (!element.hasAttribute("id")) {
      continue;
    }

    const id = element.getAttribute("id") ?? "";
    if (!id.trim()) {
      throw validationError(`empty id attribute on <${element.localName}>`);
    }
    if (ids.has(id)) {
      throw validationError(`duplicate id "${id}"`);
    }
    ids.add(id);
  }

  for (const element of elements) {
    for (const attribute of Array.from(element.attributes)) {
      if (attribute.localName.toLowerCase() !== "href") {
        continue;
      }

      const reference = attribute.value.trim();
      if (reference.startsWith("#") && !ids.has(reference.slice(1))) {
        throw validationError(
          `missing local href reference "${reference}" on <${element.localName}>`,
        );
      }
    }
  }

  const targets = elements.flatMap((element) => {
    const tagName = element.localName.toLowerCase();
    const id = element.getAttribute("id");
    return addressableTags.has(tagName) && id && !isInsideResource(element)
      ? [{ id, tagName }]
      : [];
  });

  if (targets.length === 0) {
    throw validationError("the SVG has no addressable targets");
  }

  return targets;
}
