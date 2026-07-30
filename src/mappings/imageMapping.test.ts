import { describe, expect, it } from "vitest";
import type { SourceRow } from "../data/normalizeWorkbook";
import type { ImageMapping } from "./schema";
import { applyImageMapping } from "./imageMapping";

const png = "data:image/png;base64,cG5n";

function parseSvg(markup: string): SVGSVGElement {
  return new DOMParser().parseFromString(markup, "image/svg+xml")
    .documentElement as unknown as SVGSVGElement;
}

function row(value: string | undefined): SourceRow {
  return {
    id: "row-1",
    values: {},
    displayedValues: value === undefined ? {} : { image: value },
  };
}

function mapping(overrides: Partial<ImageMapping> = {}): ImageMapping {
  return {
    id: "mapping-1",
    targetId: "photo",
    columnId: "image",
    type: "image",
    fit: "contain",
    emptyBehavior: "hide",
    ...overrides,
  };
}

function imageSvg(
  id = "photo",
  attributes = 'x="2" y="3" width="40" height="20"',
): string {
  return `<svg xmlns:xlink="http://www.w3.org/1999/xlink"><image id="${id}" ${attributes} transform="rotate(5)" data-note="keep" display="none" xlink:href="old"/></svg>`;
}

function target(svg: SVGSVGElement): Element | undefined {
  return Array.from(svg.getElementsByTagName("image")).find(
    (element) => element.getAttribute("id") === "photo",
  );
}

describe("applyImageMapping", () => {
  it.each([
    ["contain", "xMidYMid meet"],
    ["cover", "xMidYMid slice"],
    ["stretch", "none"],
  ] as const)("sets %s fitting on safe direct data URLs", (fit, expected) => {
    const svg = parseSvg(imageSvg());

    expect(applyImageMapping(svg, row(` ${png} `), mapping({ fit }))).toEqual(
      [],
    );
    const image = target(svg)!;
    expect(image.getAttribute("href")).toBe(png);
    expect(image.getAttribute("xlink:href")).toBeNull();
    expect(image.getAttribute("transform")).toBe("rotate(5)");
    expect(image.getAttribute("data-note")).toBe("keep");
    expect(image.getAttribute("x")).toBe("2");
    expect(image.getAttribute("y")).toBe("3");
    expect(image.hasAttribute("display")).toBe(false);
    expect(image.getAttribute("preserveAspectRatio")).toBe(expected);
  });

  it.each(["blob:https://app.test/asset", "https://cdn.test/photo.png"])(
    "accepts trusted resolver href %s",
    (href) => {
      const svg = parseSvg(imageSvg());

      expect(
        applyImageMapping(svg, row("asset-key"), mapping(), () => href),
      ).toEqual([]);
      expect(target(svg)?.getAttribute("href")).toBe(href);
    },
  );

  it("rejects unsafe direct and resolved URLs without mutation", () => {
    const direct = parseSvg(imageSvg());
    const resolved = parseSvg(imageSvg());
    const resolvedSvg = parseSvg(imageSvg());

    expect(
      applyImageMapping(direct, row("data:image/svg+xml,<svg/>"), mapping())[0],
    ).toMatchObject({ code: "unsafe-image" });
    expect(
      applyImageMapping(
        resolved,
        row("asset"),
        mapping(),
        () => "javascript:alert(1)",
      )[0],
    ).toMatchObject({ code: "unsafe-image" });
    expect(
      applyImageMapping(
        resolvedSvg,
        row("asset"),
        mapping(),
        () => "data:image/svg+xml,<svg/>",
      )[0],
    ).toMatchObject({ code: "unsafe-image" });
    expect(target(direct)?.getAttribute("xlink:href")).toBe("old");
    expect(target(resolved)?.getAttribute("xlink:href")).toBe("old");
    expect(target(resolvedSvg)?.getAttribute("xlink:href")).toBe("old");
  });

  it.each(["http://cdn.test/photo.png", "file:///tmp/photo.png"])(
    "rejects unsafe resolver protocols %s",
    (href) => {
      const svg = parseSvg(imageSvg());

      expect(
        applyImageMapping(svg, row("asset"), mapping(), () => href)[0],
      ).toMatchObject({ code: "unsafe-image" });
    },
  );

  it("reports missing and throwing resolvers without mutation", () => {
    const missing = parseSvg(imageSvg());
    const throwing = parseSvg(imageSvg());

    expect(
      applyImageMapping(missing, row("asset"), mapping(), () => undefined)[0],
    ).toMatchObject({ code: "missing-image" });
    expect(
      applyImageMapping(throwing, row("asset"), mapping(), () => {
        throw new Error("no asset");
      })[0],
    ).toMatchObject({ code: "image-resolver-failed" });
    expect(target(missing)?.getAttribute("xlink:href")).toBe("old");
    expect(target(throwing)?.getAttribute("xlink:href")).toBe("old");
  });

  it("handles every empty path", () => {
    const hide = parseSvg(imageSvg());
    const keep = parseSvg(imageSvg());
    const error = parseSvg(imageSvg());
    const required = parseSvg(imageSvg());

    expect(applyImageMapping(hide, row(" "), mapping())).toEqual([]);
    expect(target(hide)?.getAttribute("display")).toBe("none");
    expect(
      applyImageMapping(
        keep,
        row(""),
        mapping({ emptyBehavior: "keep-template" }),
      ),
    ).toEqual([]);
    expect(target(keep)?.getAttribute("xlink:href")).toBe("old");
    expect(
      applyImageMapping(error, row(""), mapping({ emptyBehavior: "error" }))[0],
    ).toMatchObject({ code: "empty-value" });
    expect(
      applyImageMapping(required, row(""), mapping({ required: true }))[0],
    ).toMatchObject({ code: "required-value" });
  });

  it("reports missing references, incompatible targets, and invalid bounds", () => {
    const column = parseSvg(imageSvg());
    const missing = parseSvg(
      '<svg><image id="other" width="1" height="1"/></svg>',
    );
    const incompatible = parseSvg('<svg><g id="photo"/></svg>');
    const bounds = parseSvg(imageSvg("photo", 'width="0" height="20"'));

    expect(
      applyImageMapping(column, row(undefined), mapping())[0],
    ).toMatchObject({
      code: "missing-column",
    });
    expect(applyImageMapping(missing, row(png), mapping())[0]).toMatchObject({
      code: "missing-target",
    });
    expect(
      applyImageMapping(incompatible, row(png), mapping())[0],
    ).toMatchObject({ code: "incompatible-target" });
    expect(applyImageMapping(bounds, row(png), mapping())[0]).toMatchObject({
      code: "invalid-bounds",
    });
  });

  it("uses special-character IDs and keeps caller source clones unchanged", () => {
    const source = parseSvg(imageSvg("photo.with[1]"));
    const clone = source.cloneNode(true) as SVGSVGElement;

    expect(
      applyImageMapping(
        clone,
        row(png),
        mapping({ targetId: "photo.with[1]" }),
      ),
    ).toEqual([]);
    expect(clone.getElementsByTagName("image")[0].getAttribute("href")).toBe(
      png,
    );
    expect(
      source.getElementsByTagName("image")[0].getAttribute("href"),
    ).toBeNull();
    expect(
      source.getElementsByTagName("image")[0].getAttribute("xlink:href"),
    ).toBe("old");
  });
});
