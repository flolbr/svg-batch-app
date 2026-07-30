# 05 — SVG and mappings

## SVG import pipeline

```text
read text
→ parse with DOMParser
→ reject parser errors
→ sanitize
→ enforce allow-list
→ validate IDs and resources
→ normalize labels
→ store accepted SVG string
→ build object tree
```

Never inject the unsanitized SVG into the application DOM.

The local importer parses SVG as XML, requires an SVG namespace root, rejects
unsupported elements and event attributes, permits only local fragment
references or embedded image data URLs, and rejects external `url(...)`
resources. DOMPurify sanitizes the accepted subset, which is parsed and
validated again before its string enters source state.

## Supported SVG subset

Support common:

- `svg`, `g`, `text`, `tspan`;
- `path`, `rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon`;
- `defs`, `clipPath`, `mask`, gradients;
- embedded `image` data URLs;
- `use` and `symbol` after testing.

Remove or reject:

- `script`;
- event attributes;
- `foreignObject`;
- external stylesheets;
- remote image/font URLs;
- unsafe `href` values;
- animation unless explicitly required.

Report unsupported features. Do not silently drop important artwork.

## Target identity

Primary key: SVG `id`.

Fallback metadata for remapping suggestions:

```ts
type TargetFingerprint = {
  id: string;
  tagName: string;
  label?: string;
  ancestorIds: string[];
};
```

Do not silently remap by fuzzy label.

All ID attributes must be non-empty and globally unique. Local `href`
references must resolve to an existing ID. Accepted mapping targets are
ID-bearing `g`, text, shape, image, and `use` elements in document order.
Resource containers (`defs`, clips, masks, gradients, and symbols) and their
descendants are not exposed as mapping targets. A template without at least one
addressable target is rejected.

## Object labels

Use the first available:

1. Inkscape label or known design-tool layer label;
2. `aria-label`;
3. child `title`;
4. `id`;
5. tag name.

The sanitized import retains the safe Inkscape label metadata needed for this
priority. Tree construction preserves document order and attaches each target
to its nearest addressable ancestor, skipping non-target wrappers.

## Tree model

```ts
type SvgTreeNode = {
  id: string;
  label: string;
  tagName: string;
  children: SvgTreeNode[];
};
```

The tree is read-only. No drag/drop or rename in the MVP.

The custom tree uses semantic tree/treeitem/group roles, roving focus,
`aria-expanded` and `aria-selected`, click or Enter selection, and standard
arrow-key navigation. Search is case- and accent-insensitive, hides
nonmatching branches while preserving ancestor context, and exposes matching
descendants. Each target currently reports Unmapped status.

## Mapping schema

```ts
type Mapping =
  | TextMapping
  | VisibilityMapping
  | GroupMapping
  | QrMapping
  | ImageMapping;

type BaseMapping = {
  id: string;
  targetId: string;
  columnId: string;
  required?: boolean;
};
```

### Direct text

```ts
type TextMapping = BaseMapping & {
  type: "text";
  fit: "keep" | "shrink" | "truncate" | "error";
  minFontSize?: number;
};
```

Target must be `text` or a supported text container.

Initially support one-line shrink-to-fit. Add wrapping only if required after MVP use.

### Visibility

```ts
type VisibilityMapping = BaseMapping & {
  type: "visibility";
  trueValues: string[];
  falseValues: string[];
  emptyBehavior: "hide" | "show" | "error";
};
```

Normalize case and whitespace.

### Exclusive child group

```ts
type GroupMapping = BaseMapping & {
  type: "exclusive-group";
  match: "data-option" | "id";
  emptyBehavior: "hide-all" | "keep-template" | "error";
};
```

Prefer direct children with `data-option`.

Do not recursively search the whole group by default.

### QR code

```ts
type QrMapping = BaseMapping & {
  type: "qr";
  errorCorrection: "L" | "M" | "Q" | "H";
  marginModules: number;
  emptyBehavior: "hide" | "error";
};
```

The target supplies bounds. Replace its visual content with vector QR paths.

### Image replacement

```ts
type ImageMapping = BaseMapping & {
  type: "image";
  fit: "contain" | "cover" | "stretch";
  emptyBehavior: "hide" | "keep-template" | "error";
};
```

Image values may resolve to:

- an embedded project asset key;
- a user-selected local asset;
- a Drive-selected file in hosted mode;
- a remote URL only when CORS permits.

For the MVP, prefer embedded project assets.

## Applying mappings

Always clone the accepted template DOM.

Order:

1. group selection;
2. visibility;
3. text;
4. image;
5. QR;
6. validation;
7. serialization.

Mapping functions return issues rather than throwing for row-level data problems.

```ts
type MappingResult = {
  svg: SVGSVGElement;
  issues: ValidationIssue[];
};
```

## Linked SVG manual reload

The project stores the accepted SVG snapshot and optional link metadata.

Reload flow:

```text
read linked source
→ sanitize and validate temporary SVG
→ hash and compare
→ compare targets with current mappings
→ show report
→ user applies or cancels
```

Auto-apply is not required.

A compatible mapping requires:

- target ID exists;
- target tag remains compatible;
- group options remain valid;
- QR/image bounds are measurable.

Keep the previous accepted SVG in transient state until the updated project is saved.

## Local file handles

Store handles in IndexedDB. Persist only:

- lookup key;
- file name;
- last known hash;
- last known modification metadata.

The embedded SVG is the portable fallback.
