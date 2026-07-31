import { describe, expect, it, vi } from "vitest";
import { downloadProjectHtml } from "./downloadProjectFile";

describe("downloadProjectHtml", () => {
  it("downloads a UTF-8 HTML Blob and revokes its object URL", async () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    const createObjectURL = vi.fn().mockReturnValue("blob:project");
    const revokeObjectURL = vi.fn();

    downloadProjectHtml("<!doctype html><title>Saved</title>", "cards.html", {
      document,
      url: { createObjectURL, revokeObjectURL },
    });

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toBe("text/html;charset=utf-8");
    await expect(blob.text()).resolves.toBe(
      "<!doctype html><title>Saved</title>",
    );
    expect(click).toHaveBeenCalledTimes(1);
    expect(click.mock.instances[0]).toMatchObject({
      href: "blob:project",
      download: "cards.html",
    });
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith("blob:project");
  });

  it("revokes the object URL when the browser click fails", () => {
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {
      throw new Error("click failed");
    });
    const revokeObjectURL = vi.fn();

    expect(() =>
      downloadProjectHtml("saved", "cards.html", {
        document,
        url: {
          createObjectURL: () => "blob:project",
          revokeObjectURL,
        },
      }),
    ).toThrow("click failed");
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith("blob:project");
  });
});
