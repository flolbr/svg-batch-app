import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SvgPreview } from "./SvgPreview";

describe("SvgPreview", () => {
  afterEach(cleanup);

  it("renders accepted SVG only in a capability-free sandbox document", () => {
    const acceptedSvg =
      '<svg id="accepted-svg"><text>Inside preview</text></svg>';
    const { container } = render(<SvgPreview acceptedSvg={acceptedSvg} />);

    const frame = screen.getByTitle("SVG preview");
    expect(frame).toHaveAttribute("sandbox", "");
    expect(frame).toHaveAttribute(
      "srcdoc",
      expect.stringContaining(acceptedSvg),
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
});
