# 03 — UI and components

## Visual reference

![UI reference](assets/ui-reference.png)

Match the reference in structure and density, not pixel-for-pixel.

## Main layout

Desktop:

```text
header
three resizable or fixed-ratio panels
bottom action bar
```

Recommended initial widths:

- data: 38%;
- SVG tree/mapping: 27%;
- preview: 35%.

On desktop, separators between panels support pointer dragging and left/right
arrow keys. Keep practical minimum widths for all three panels.

Below 1100 px:

- stack panels;
- preview first or accessible through tabs;
- hide the resize separators;
- keep the bottom action bar reachable.

## Left panel — Data

Header controls:

- upload local file;
- open from Google Drive when available;
- worksheet selector;
- search imported values;
- search scope selector;
- filters;
- columns.

Grid:

- leading row checkbox;
- sticky header;
- editable cells only after explicit edit action;
- final `+ Add row` line;
- source/modified/manual marker;
- footer counts.

Search:

- searches cell values, not column names;
- supports all columns or chosen columns;
- accent-insensitive and case-insensitive;
- fuzzy matching is optional per search, with a visible exact/fuzzy toggle if results become surprising.

Column filter menu:

- distinct values;
- text contains/equals;
- number range;
- date range;
- blank/non-blank.

Do not reproduce every Excel filter feature.

## Center panel — SVG Objects

Top:

- object search;
- compact source status;
- reload/relink button.

Tree:

- custom component;
- semantic `tree` and `treeitem` roles;
- left/right expands and collapses;
- up/down changes selection;
- enter selects;
- mapped/warning/error status icon;
- search hides nonmatching branches but preserves ancestor context.

Mapping editor:

- target summary;
- mapping type;
- spreadsheet column;
- type-specific options;
- validation message;
- remove mapping.

Use Mantine controls directly.

## Right panel — Preview

Controls:

- previous/next selected or matching row;
- current row indicator;
- zoom;
- fit;
- highlight selected SVG target.

Preview:

- render inside an isolated wrapper;
- no direct event handlers from imported SVG;
- show a checker or neutral canvas;
- indicate overflow and missing mappings;
- keep QR codes vector.

## Bottom bar

Required actions:

- Validate
- Save project
- Export selected
- Save to Google Drive when available

Also show:

- unsaved state;
- selected row count;
- validation error count;
- current output formats.

## Feedback

Use:

- inline field errors for mapping configuration;
- a validation drawer or modal for batch issues;
- notifications for import/save success and recoverable failure;
- confirmation only for destructive actions.

Avoid modal chains.

## Component rule

Use Mantine first.

Create a local component when:

- it combines meaningful domain behavior;
- it is used in more than one place; or
- keeping it inside a parent makes the parent materially harder to read.

A one-use 15-line JSX fragment does not need its own component.
