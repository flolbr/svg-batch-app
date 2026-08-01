import { describe, expect, it, vi } from "vitest";
import {
  createDriveFile,
  downloadDriveFile,
  driveErrorMessage,
  DriveRequestError,
  getDriveMetadata,
  GOOGLE_SHEET_MIME_TYPE,
  hasDriveConflict,
  overwriteDriveFile,
  saveExistingDriveFile,
  XLSX_MIME_TYPE,
  type DriveReference,
} from "./driveFiles";

const reference: DriveReference = {
  provider: "google-drive",
  fileId: "file-1",
  name: "project.html",
  mimeType: "text/html",
  modifiedTime: "2026-08-01T10:00:00.000Z",
  version: "3",
};

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Drive metadata and downloads", () => {
  it("reads the safe metadata fields with bearer authorization", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        id: "file-1",
        name: "project.html",
        mimeType: "text/html",
        modifiedTime: "2026-08-01T10:00:00.000Z",
        version: "3",
      }),
    );
    await expect(
      getDriveMetadata("token", "file-1", fetchImpl),
    ).resolves.toEqual(reference);
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("/drive/v3/files/file-1?fields="),
      { headers: { Authorization: "Bearer token" } },
    );
  });

  it("downloads ordinary files and exports native Sheets to XLSX", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("<svg/>", { status: 200 }))
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1, 2]), { status: 200 }),
      );

    const svg = await downloadDriveFile(
      "token",
      { fileId: "svg-1", name: "badge.svg", mimeType: "image/svg+xml" },
      fetchImpl,
    );
    const sheet = await downloadDriveFile(
      "token",
      { fileId: "sheet-1", name: "Members", mimeType: GOOGLE_SHEET_MIME_TYPE },
      fetchImpl,
    );

    expect(svg.name).toBe("badge.svg");
    expect(fetchImpl.mock.calls[0][0]).toContain("alt=media");
    expect(sheet.name).toBe("Members.xlsx");
    expect(sheet.type).toBe(XLSX_MIME_TYPE);
    expect(fetchImpl.mock.calls[1][0]).toContain("/export?");
    expect(fetchImpl.mock.calls[1][0]).toContain(
      encodeURIComponent(XLSX_MIME_TYPE),
    );
  });

  it("surfaces Drive error details and stable recovery messages", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        jsonResponse({ error: { message: "File not found" } }, 404),
      );
    await expect(getDriveMetadata("token", "gone", fetchImpl)).rejects.toEqual(
      expect.objectContaining({ status: 404, message: "File not found" }),
    );
    expect(driveErrorMessage(new DriveRequestError("expired", 401))).toContain(
      "expired",
    );
    expect(driveErrorMessage(new DriveRequestError("missing", 404))).toContain(
      "missing",
    );
    expect(
      driveErrorMessage(new DriveRequestError("exportSizeLimitExceeded", 403)),
    ).toContain("too large");
    expect(driveErrorMessage(new DriveRequestError("large", 413))).toContain(
      "too large",
    );
  });
});

describe("Drive saves and conflicts", () => {
  it("creates multipart files in the selected folder", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        id: "created",
        name: "export.zip",
        mimeType: "application/zip",
        version: "1",
      }),
    );
    await createDriveFile(
      "token",
      {
        name: "export.zip",
        mimeType: "application/zip",
        content: new Uint8Array([1]),
        parentId: "folder-1",
      },
      fetchImpl,
    );
    const [, init] = fetchImpl.mock.calls[0];
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeInstanceOf(Blob);
    expect(new Headers(init?.headers).get("Content-Type")).toMatch(
      /^multipart\/related; boundary=svg-batch-/u,
    );
    expect(await (init!.body as Blob).text()).toContain(
      '"parents":["folder-1"]',
    );
  });

  it("updates existing content when metadata is unchanged", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          id: reference.fileId,
          name: reference.name,
          mimeType: reference.mimeType,
          modifiedTime: reference.modifiedTime,
          version: reference.version,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: reference.fileId,
          name: reference.name,
          mimeType: reference.mimeType,
          modifiedTime: "2026-08-01T11:00:00.000Z",
          version: "4",
        }),
      );
    const chooseConflict = vi.fn();
    const result = await saveExistingDriveFile({
      token: "token",
      known: reference,
      content: "html",
      mimeType: "text/html",
      chooseConflict,
      fetchImpl,
    });
    expect(result.status).toBe("saved");
    expect(chooseConflict).not.toHaveBeenCalled();
    expect(fetchImpl.mock.calls[1][1]?.method).toBe("PATCH");
  });

  it("offers copy, reload, overwrite, and cancel on conflicts", async () => {
    expect(hasDriveConflict(reference, { ...reference, version: "4" })).toBe(
      true,
    );
    expect(hasDriveConflict(reference, { ...reference })).toBe(false);

    for (const choice of ["reload", "cancel"] as const) {
      const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
        jsonResponse({
          id: reference.fileId,
          name: reference.name,
          mimeType: reference.mimeType,
          modifiedTime: reference.modifiedTime,
          version: "4",
        }),
      );
      const result = await saveExistingDriveFile({
        token: "token",
        known: reference,
        content: "html",
        mimeType: "text/html",
        chooseConflict: () => choice,
        fetchImpl,
      });
      expect(result.status).toBe(choice === "cancel" ? "cancelled" : "reload");
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    }

    const responses = () =>
      vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          jsonResponse({
            id: reference.fileId,
            name: reference.name,
            mimeType: reference.mimeType,
            modifiedTime: reference.modifiedTime,
            version: "4",
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            id: "saved",
            name: reference.name,
            mimeType: reference.mimeType,
            version: "5",
          }),
        );
    await expect(
      saveExistingDriveFile({
        token: "token",
        known: reference,
        content: "html",
        mimeType: "text/html",
        chooseConflict: () => "overwrite",
        fetchImpl: responses(),
      }),
    ).resolves.toMatchObject({ status: "saved" });
    await expect(
      saveExistingDriveFile({
        token: "token",
        known: reference,
        content: "html",
        mimeType: "text/html",
        chooseConflict: () => "save-copy",
        fetchImpl: responses(),
      }),
    ).resolves.toMatchObject({ status: "copied" });
  });

  it("can overwrite directly", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        id: reference.fileId,
        name: reference.name,
        mimeType: reference.mimeType,
      }),
    );
    await overwriteDriveFile(
      "token",
      reference,
      "html",
      "text/html",
      fetchImpl,
    );
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({ method: "PATCH" });
  });
});
