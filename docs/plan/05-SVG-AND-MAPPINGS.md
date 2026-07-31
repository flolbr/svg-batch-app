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

The live preview uses only the accepted string in an empty-capability
sandboxed `srcDoc` iframe. Imported markup never enters the parent application
DOM, and the iframe ignores pointer interaction. Selecting an SVG object
derives a separate preview document with a highlight marker; the accepted
template snapshot is never modified. Zoom similarly changes only derived
iframe presentation CSS, while Fit restores the contained 100% view.

The SVG panel reports a compact source status. A local import is `Embedded`,
and no accepted source is `Unavailable`. `Linked`, `Drive`, and `Modified` are
typed states for their later adapters; exposing the labels does not enable
unfinished source behavior.

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
descendants.

Each target derives one configuration status without reading Zustand inside
the tree: Unmapped when no mapping exists; Error when the schema, target ID, or
target/type pairing is invalid; Warning when the active worksheet lacks the
configured column; and Mapped otherwise. The same pure derivation supplies the
mapping editor's inline feedback so those surfaces cannot disagree.

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

The runtime Zod schemas are strict: mapping, target, and column IDs are trimmed
and non-empty; optional minimum font size is positive; and QR margin is a
nonnegative integer. Cross-field behavior remains the responsibility of each
mapping implementation.

The mapping editor keeps one runtime mapping per SVG target in Zustand and
uses the selected worksheet's complete normalized column list. It offers only
structurally compatible mapping types, preserves shared fields when the type
changes, and replaces type-specific fields with explicit defaults. Importing a
replacement SVG clears mappings tied to the previous template. Worksheet
changes retain mappings so the shared validation flow can report missing
columns instead of silently deleting configuration.

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

Direct text mapping operates on a caller-owned SVG clone and replaces the
target's text content with the row's displayed cell value. Missing columns,
targets, incompatible target tags, and whitespace-only required values produce
structured validation issues without mutating the target.

`keep` applies the displayed value without measuring it. The other modes use an
injected metrics provider so preview and export can supply the same available
width, font size, and text measurement function. `shrink` reduces the font size
proportionally and respects `minFontSize`; overflow at that minimum is reported
as a structured issue. `truncate` keeps the longest Unicode-safe prefix that
fits with an ellipsis, or uses an empty string when the ellipsis itself cannot
fit. `error` preserves the full value and reports overflow. Missing or invalid
metrics and measurement failures leave the target unchanged.

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

Visibility mapping changes only the target's direct `display` attribute on the
caller-owned SVG clone. True/show removes it and false/hide sets it to `none`.
Required and configured empty behavior are applied before normalized true/false
matching; unknown or ambiguous values return issues without changing the
target.

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

The implementation considers direct option/ID children only. `data-option`
mode prefers an exact trimmed option match and then falls back to a direct
child ID; explicit ID mode matches IDs only. Selection hides other candidates
without changing non-candidate children or nested descendants. Unknown or
ambiguous values do not partially change the group.

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

The QR target is a group whose first direct rectangle supplies finite positive
numeric bounds. Output is a centered square with the configured quiet-zone
margin: a white vector background and one black module path inside a
`crispEdges` transformed group. Invalid bounds or generation failures leave
the placeholder intact and return an issue.

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

Image mapping requires a bounded `<image>` target and preserves its geometry
while setting `preserveAspectRatio` for contain, cover, or stretch. Direct row
values accept embedded raster data URLs only. A caller-supplied synchronous
resolver may provide validated raster data, blob, or HTTPS URLs for later
asset adapters; unsafe, missing, or failing resolutions leave the template
unchanged and return an issue.

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

`applyMappings` accepts a parsed accepted-template element, deep-clones it,
then applies all configured mappings in the order above regardless of their
input-array order. It preserves input order within each mapping type,
aggregates issues without stopping later mappings, and returns only the clone.
Text metrics and image value resolution are injected through explicit options
so preview and export can share orchestration while supplying their own
environment-specific dependencies. The Phase 5 validation and serialization
steps consume this result rather than mutating the accepted template.

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
