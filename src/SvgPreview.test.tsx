import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SvgPreview } from "./SvgPreview";

describe("SvgPreview", () => {
  afterEach(cleanup);

  it("renders accepted SVG in a script-free same-origin sandbox document", () => {
    const acceptedSvg =
      '<svg id="accepted-svg"><text>Inside preview</text></svg>';
    const { container } = render(<SvgPreview acceptedSvg={acceptedSvg} />);

    const frame = screen.getByTitle("SVG preview");
    expect(frame).toHaveAttribute("sandbox", "allow-same-origin");
    expect(frame).toHaveAttribute(
      "srcdoc",
      expect.stringContaining(acceptedSvg),
    );
    expect(frame.getAttribute("srcdoc")).toContain(
      '@font-face{font-family:Ethnocentric;src:local("Ethnocentric"),local("Ethnocentric Regular"),local("Ethnocentric-Regular");font-style:normal;font-weight:400;font-display:block}',
    );
    expect(container.querySelector("svg")).toBeNull();
    expect(screen.queryByText("Inside preview")).not.toBeInTheDocument();
  });

  it("replaces the isolated document when the accepted SVG changes", () => {
    const { rerender } = render(
      <SvgPreview acceptedSvg={'<svg id="first-svg"></svg>'} />,
    );
    const frame = screen.getByTitle("SVG preview");

    expect(frame).toHaveAttribute(
      "srcdoc",
      expect.stringContaining("first-svg"),
    );

    rerender(<SvgPreview acceptedSvg={'<svg id="second-svg"></svg>'} />);

    expect(frame).toHaveAttribute(
      "srcdoc",
      expect.stringContaining("second-svg"),
    );
    expect(frame).not.toHaveAttribute(
      "srcdoc",
      expect.stringContaining("first-svg"),
    );
  });

  it("highlights only the derived preview document", () => {
    const acceptedSvg = '<svg><g id="group"><rect id="target"/></g></svg>';
    const { rerender } = render(
      <SvgPreview acceptedSvg={acceptedSvg} selectedTargetId="target" />,
    );
    const frame = screen.getByTitle("SVG preview");

    expect(frame.getAttribute("srcdoc")).toContain(
      'id="target" data-svg-batch-highlight="true"',
    );
    expect(acceptedSvg).not.toContain("data-svg-batch-highlight");

    rerender(<SvgPreview acceptedSvg={acceptedSvg} selectedTargetId="group" />);
    expect(frame.getAttribute("srcdoc")).toContain(
      'id="group" data-svg-batch-highlight="true"',
    );
    expect(frame.getAttribute("srcdoc")).not.toContain(
      'id="target" data-svg-batch-highlight="true"',
    );
  });

  it("scales only the derived preview presentation", () => {
    const acceptedSvg = '<svg id="accepted-svg"><rect id="target"/></svg>';
    const { rerender } = render(
      <SvgPreview
        acceptedSvg={acceptedSvg}
        selectedTargetId="target"
        zoomPercent={150}
      />,
    );
    const frame = screen.getByTitle("SVG preview");

    expect(frame.getAttribute("srcdoc")).toContain("transform:scale(1.5)");
    expect(frame.getAttribute("srcdoc")).toContain(
      'id="target" data-svg-batch-highlight="true"',
    );
    expect(acceptedSvg).not.toContain("transform:scale");
    expect(acceptedSvg).not.toContain("data-svg-batch-highlight");

    rerender(<SvgPreview acceptedSvg={acceptedSvg} />);
    expect(frame.getAttribute("srcdoc")).toContain("transform:scale(1)");
  });

  it("embeds a project font in the isolated preview", () => {
    const { container } = render(
      <SvgPreview
        acceptedSvg={'<svg><text font-family="Ethnocentric">Text</text></svg>'}
        fontAssets={[
          { dataUrl: "data:font/otf;base64,Zm9udA==", mimeType: "font/otf" },
          {
            dataUrl: "data:font/woff2;base64,Zm9udA==",
            mimeType: "font/woff2",
          },
        ]}
      />,
    );
    expect(container.querySelector("iframe")).toHaveAttribute(
      "srcdoc",
      expect.stringContaining(
        '@font-face{font-family:"Ethnocentric";src:url(data:font/otf;base64,Zm9udA==) format("opentype")',
      ),
    );
    expect(container.querySelector("iframe")?.getAttribute("srcdoc")).toContain(
      'src:url(data:font/woff2;base64,Zm9udA==) format("woff2")',
    );
  });
});
