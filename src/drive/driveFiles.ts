export const GOOGLE_SHEET_MIME_TYPE = "application/vnd.google-apps.spreadsheet";
export const XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export type DriveReference = {
  provider: "google-drive";
  fileId: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  version?: string;
};

export type DriveConflictChoice =
  "save-copy" | "reload" | "overwrite" | "cancel";

export class DriveRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "DriveRequestError";
  }
}

type Fetch = typeof fetch;

function driveUrl(path: string, parameters: Record<string, string>): string {
  const url = new URL(`https://www.googleapis.com${path}`);
  for (const [key, value] of Object.entries(parameters)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function authorization(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

async function requireOk(
  response: Response,
  action: string,
): Promise<Response> {
  if (response.ok) return response;

  const fallback = `${action} failed with HTTP ${response.status}.`;
  let detail = "";
  try {
    const body = (await response.json()) as {
      error?: { message?: string };
    };
    detail = body.error?.message?.trim() ?? "";
  } catch {
    // Drive does not always return JSON, so retain the status fallback.
  }
  throw new DriveRequestError(detail || fallback, response.status);
}

function toReference(metadata: {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  version?: string;
}): DriveReference {
  return {
    provider: "google-drive",
    fileId: metadata.id,
    name: metadata.name,
    mimeType: metadata.mimeType,
    ...(metadata.modifiedTime ? { modifiedTime: metadata.modifiedTime } : {}),
    ...(metadata.version ? { version: metadata.version } : {}),
  };
}

export async function getDriveMetadata(
  token: string,
  fileId: string,
  fetchImpl: Fetch = fetch,
): Promise<DriveReference> {
  const response = await fetchImpl(
    driveUrl(`/drive/v3/files/${encodeURIComponent(fileId)}`, {
      fields: "id,name,mimeType,modifiedTime,version",
    }),
    { headers: authorization(token) },
  );
  await requireOk(response, "Reading Google Drive metadata");
  return toReference(await response.json());
}

export async function downloadDriveFile(
  token: string,
  reference: Pick<DriveReference, "fileId" | "name" | "mimeType">,
  fetchImpl: Fetch = fetch,
): Promise<File> {
  const isSheet = reference.mimeType === GOOGLE_SHEET_MIME_TYPE;
  const path = isSheet
    ? `/drive/v3/files/${encodeURIComponent(reference.fileId)}/export`
    : `/drive/v3/files/${encodeURIComponent(reference.fileId)}`;
  const response = await fetchImpl(
    driveUrl(path, isSheet ? { mimeType: XLSX_MIME_TYPE } : { alt: "media" }),
    { headers: authorization(token) },
  );
  await requireOk(
    response,
    isSheet ? "Exporting the Google Sheet" : "Downloading the Drive file",
  );
  const name = isSheet
    ? `${reference.name.replace(/\.xlsx$/iu, "")}.xlsx`
    : reference.name;
  return new File([await response.blob()], name, {
    type: isSheet ? XLSX_MIME_TYPE : reference.mimeType,
  });
}

type DriveContent = string | ArrayBuffer | Uint8Array;

type DriveUpload = {
  name: string;
  mimeType: string;
  content: DriveContent;
  parentId?: string;
};

function multipartBody(upload: DriveUpload): Blob {
  const metadata = {
    name: upload.name,
    ...(upload.parentId ? { parents: [upload.parentId] } : {}),
  };
  const boundary = `svg-batch-${crypto.randomUUID()}`;
  const content =
    upload.content instanceof Uint8Array
      ? Uint8Array.from(upload.content).buffer
      : upload.content;
  return new Blob(
    [
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
      JSON.stringify(metadata),
      `\r\n--${boundary}\r\nContent-Type: ${upload.mimeType}\r\n\r\n`,
      content,
      `\r\n--${boundary}--`,
    ],
    { type: `multipart/related; boundary=${boundary}` },
  );
}

function contentBlob(content: DriveContent, mimeType: string): Blob {
  const part =
    content instanceof Uint8Array ? Uint8Array.from(content).buffer : content;
  return new Blob([part], { type: mimeType });
}

export async function createDriveFile(
  token: string,
  upload: DriveUpload,
  fetchImpl: Fetch = fetch,
): Promise<DriveReference> {
  const body = multipartBody(upload);
  const response = await fetchImpl(
    driveUrl("/upload/drive/v3/files", {
      uploadType: "multipart",
      fields: "id,name,mimeType,modifiedTime,version",
    }),
    {
      method: "POST",
      headers: { ...authorization(token), "Content-Type": body.type },
      body,
    },
  );
  await requireOk(response, "Creating the Google Drive file");
  return toReference(await response.json());
}

export async function overwriteDriveFile(
  token: string,
  reference: DriveReference,
  content: DriveContent,
  mimeType: string,
  fetchImpl: Fetch = fetch,
): Promise<DriveReference> {
  const response = await fetchImpl(
    driveUrl(`/upload/drive/v3/files/${encodeURIComponent(reference.fileId)}`, {
      uploadType: "media",
      fields: "id,name,mimeType,modifiedTime,version",
    }),
    {
      method: "PATCH",
      headers: { ...authorization(token), "Content-Type": mimeType },
      body: contentBlob(content, mimeType),
    },
  );
  await requireOk(response, "Updating the Google Drive file");
  return toReference(await response.json());
}

export function hasDriveConflict(
  known: DriveReference,
  current: DriveReference,
): boolean {
  if (known.version && current.version && known.version !== current.version) {
    return true;
  }
  return Boolean(
    known.modifiedTime &&
    current.modifiedTime &&
    known.modifiedTime !== current.modifiedTime,
  );
}

type SaveExistingDriveFileInput = {
  token: string;
  known: DriveReference;
  content: DriveContent;
  mimeType: string;
  chooseConflict: (
    current: DriveReference,
  ) => DriveConflictChoice | Promise<DriveConflictChoice>;
  copyParentId?: string;
  fetchImpl?: Fetch;
};

export type SaveExistingDriveFileResult =
  | { status: "saved" | "copied"; reference: DriveReference }
  | { status: "reload"; reference: DriveReference }
  | { status: "cancelled"; reference: DriveReference };

export async function saveExistingDriveFile({
  token,
  known,
  content,
  mimeType,
  chooseConflict,
  copyParentId,
  fetchImpl = fetch,
}: SaveExistingDriveFileInput): Promise<SaveExistingDriveFileResult> {
  const current = await getDriveMetadata(token, known.fileId, fetchImpl);
  if (!hasDriveConflict(known, current)) {
    return {
      status: "saved",
      reference: await overwriteDriveFile(
        token,
        current,
        content,
        mimeType,
        fetchImpl,
      ),
    };
  }

  const choice = await chooseConflict(current);
  if (choice === "cancel") return { status: "cancelled", reference: current };
  if (choice === "reload") return { status: "reload", reference: current };
  if (choice === "save-copy") {
    return {
      status: "copied",
      reference: await createDriveFile(
        token,
        {
          name: `Copy of ${known.name}`,
          mimeType,
          content,
          parentId: copyParentId,
        },
        fetchImpl,
      ),
    };
  }
  return {
    status: "saved",
    reference: await overwriteDriveFile(
      token,
      current,
      content,
      mimeType,
      fetchImpl,
    ),
  };
}

export function driveErrorMessage(error: unknown): string {
  if (!(error instanceof DriveRequestError)) {
    return error instanceof Error ? error.message : "Google Drive failed.";
  }
  if (error.status === 401) {
    return "Google Drive authorization expired. Sign in again and retry.";
  }
  if (error.status === 403) {
    if (/export|size|limit/iu.test(error.message)) {
      return "The Google Sheet is too large to export as XLSX.";
    }
    return "Google Drive access was denied or revoked.";
  }
  if (error.status === 404) {
    return "The Google Drive file is missing or no longer shared with this app.";
  }
  if (error.status === 413) {
    return "The Google Sheet is too large to export as XLSX.";
  }
  return error.message;
}
