import DOMPurify from "dompurify";
import { buildSvgTree, type SvgTreeNode } from "./buildSvgTree";
import {
  validateSvgTargets,
  type SvgTarget,
} from "./validateSvgTargets";

const supportedElements = new Set([
  "svg",
  "g",
  "text",
  "tspan",
  "title",
  "desc",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "defs",
  "clippath",
  "mask",
  "lineargradient",
  "radialgradient",
  "stop",
  "image",
  "use",
  "symbol",
  "filter",
  "fecolormatrix",
]);
const SODIPODI_NAMESPACE =
  "http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd";

export type SvgSourceStatus =
  "embedded" | "linked" | "drive" | "unavailable" | "modified";

export type ImportedSvg = {
  fileName: string;
  fileSize: number;
  acceptedSvg: string;
  sourceStatus: SvgSourceStatus;
  targets: SvgTarget[];
  tree: SvgTreeNode[];
};

export type PersistedSvgSnapshot = Pick<
  ImportedSvg,
  "fileName" | "fileSize" | "acceptedSvg" | "sourceStatus"
>;

function importError(message: string): Error {
  return new Error(`SVG import rejected: ${message}`);
}

function isLocalReference(value: string): boolean {
  return /^#[^\s]+$/.test(value);
}

function isEmbeddedImage(value: string): boolean {
  return /^data:image\//i.test(value);
}

function validateResourceUrls(element: Element): void {
  for (const attribute of Array.from(element.attributes)) {
    const value = attribute.value.trim();
    const name = attribute.localName.toLowerCase();

    if (/^on/i.test(attribute.name)) {
      throw importError(
        `event handler attribute "${attribute.name}" is not supported`,
      );
    }

    if (name === "href") {
      const isSafeImage =
        element.localName.toLowerCase() === "image" && isEmbeddedImage(value);
      if (!isLocalReference(value) && !isSafeImage) {
        throw importError(`unsafe href on <${element.localName}>`);
      }
    }

    for (const match of value.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)) {
      if (!isLocalReference(match[2].trim())) {
        throw importError(`external url() resource in "${attribute.name}"`);
      }
    }
  }
}

function parseAndValidateSvg(source: string): Element {
  const document = new DOMParser().parseFromString(source, "image/svg+xml");
  if (
    document.documentElement.localName.toLowerCase() === "parsererror" ||
    document.getElementsByTagName("parsererror").length > 0
  ) {
    throw importError("the file is not well-formed XML");
  }

  const root = document.documentElement;
  if (
    root.localName.toLowerCase() !== "svg" ||
    root.namespaceURI !== "http://www.w3.org/2000/svg"
  ) {
    throw importError("the document root must be an SVG element");
  }

  for (const element of Array.from(document.getElementsByTagName("*"))) {
    if (
      element.namespaceURI === SODIPODI_NAMESPACE &&
      element.localName.toLowerCase() === "namedview"
    ) {
      if (element.children.length > 0) {
        throw importError("sodipodi:namedview metadata cannot contain elements");
      }
      element.remove();
      continue;
    }
    const name = element.localName.toLowerCase();
    if (
      element.namespaceURI !== "http://www.w3.org/2000/svg" ||
      !supportedElements.has(name)
    ) {
      throw importError(`unsupported element <${element.localName}>`);
    }
    validateResourceUrls(element);
  }

  return root;
}

function acceptSvgSource(source: string): Pick<
  ImportedSvg,
  "acceptedSvg" | "targets" | "tree"
> {
  const root = parseAndValidateSvg(source);
  const acceptedSvg = DOMPurify.sanitize(root.outerHTML, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: Array.from(supportedElements),
    ADD_ATTR: ["inkscape:label", "xlink:href", "xmlns:inkscape"],
    // SVG IDs are mapping targets and may legitimately be common names such
    // as "name". The accepted document remains SVG-only and is not injected
    // into the application DOM unsafely.
    SANITIZE_DOM: false,
  });

  // Sanitize after parsing, then validate once more so accepted input stays in
  // the same narrow subset even if DOMPurify configuration changes.
  parseAndValidateSvg(acceptedSvg);
  const targets = validateSvgTargets(acceptedSvg);
  const tree = buildSvgTree(acceptedSvg);

  return { acceptedSvg, targets, tree };
}

export async function importSvgFile(file: File): Promise<ImportedSvg> {
  const accepted = acceptSvgSource(await file.text());

  return {
    fileName: file.name,
    fileSize: file.size,
    sourceStatus: "embedded",
    ...accepted,
  };
}

export function restoreImportedSvg(
  snapshot: PersistedSvgSnapshot,
): ImportedSvg {
  return {
    fileName: snapshot.fileName,
    fileSize: snapshot.fileSize,
    sourceStatus: snapshot.sourceStatus,
    ...acceptSvgSource(snapshot.acceptedSvg),
  };
}
