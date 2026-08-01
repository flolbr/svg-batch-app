import type { GoogleDriveConfiguration } from "../capabilities";

export const GOOGLE_IDENTITY_SCRIPT_URL =
  "https://accounts.google.com/gsi/client";
export const GOOGLE_API_SCRIPT_URL = "https://apis.google.com/js/api.js";
export const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";

export const supportedGoogleDriveMimeTypes = [
  "image/svg+xml",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/html",
  "application/vnd.google-apps.spreadsheet",
] as const;

export type GoogleDriveFileReference = {
  id: string;
  name: string;
  mimeType: string;
};

type TokenResponse = { access_token?: string; error?: string };

type GoogleClientWindow = {
  google?: {
    accounts?: {
      oauth2?: {
        initTokenClient: (options: {
          client_id: string;
          scope: string;
          callback: (response: TokenResponse) => void;
          error_callback?: (error: { type?: string; message?: string }) => void;
        }) => { requestAccessToken: (options?: { prompt?: string }) => void };
      };
    };
    picker?: GooglePickerNamespace;
  };
  gapi?: {
    load: (
      name: string,
      options: { callback: () => void; onerror: () => void },
    ) => void;
  };
};

type GooglePickerNamespace = {
  PickerBuilder: new () => GooglePickerBuilder;
  DocsView: new (viewId: unknown) => GooglePickerView;
  ViewId: { DOCS: unknown; FOLDERS: unknown };
  Action: { PICKED: unknown; CANCEL: unknown };
  Response: { ACTION: PropertyKey; DOCUMENTS: PropertyKey };
  Document: { ID: PropertyKey; NAME: PropertyKey; MIME_TYPE: PropertyKey };
};

type GooglePickerView = {
  setMimeTypes?: (mimeTypes: string) => GooglePickerView;
  setIncludeFolders?: (includeFolders: boolean) => GooglePickerView;
  setSelectFolderEnabled?: (enabled: boolean) => GooglePickerView;
};

type GooglePickerBuilder = {
  setDeveloperKey: (apiKey: string) => GooglePickerBuilder;
  setAppId: (appId: string) => GooglePickerBuilder;
  setOAuthToken: (accessToken: string) => GooglePickerBuilder;
  addView: (view: GooglePickerView) => GooglePickerBuilder;
  setCallback: (
    callback: (data: Record<PropertyKey, unknown>) => void,
  ) => GooglePickerBuilder;
  build: () => { setVisible: (visible: boolean) => void };
};

type GoogleScript = HTMLScriptElement;

type GoogleDocument = {
  createElement: (tagName: "script") => GoogleScript;
  head?: { appendChild: (node: GoogleScript) => unknown };
  body?: { appendChild: (node: GoogleScript) => unknown };
};

export type GoogleClientEnvironment = {
  window: GoogleClientWindow;
  document: GoogleDocument;
};

const scriptLoads = new WeakMap<object, Map<string, Promise<void>>>();
const pickerLoads = new WeakMap<object, Promise<void>>();

function browserEnvironment(): GoogleClientEnvironment {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("Google Drive is only available in a browser.");
  }

  return { window: window as GoogleClientWindow, document };
}

function requireValue(value: string | undefined, name: string): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`Google Drive ${name} is not configured.`);
  }
  return trimmed;
}

function loadScript(
  environment: GoogleClientEnvironment,
  url: string,
): Promise<void> {
  let loads = scriptLoads.get(environment.document);
  if (!loads) {
    loads = new Map();
    scriptLoads.set(environment.document, loads);
  }

  const current = loads.get(url);
  if (current) return current;

  const target = environment.document.head ?? environment.document.body;
  if (!target) {
    return Promise.reject(
      new Error("Google scripts cannot be added to this document."),
    );
  }

  const promise = new Promise<void>((resolve, reject) => {
    const script = environment.document.createElement("script");
    script.src = url;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error(`Unable to load Google script: ${url}`));
    target.appendChild(script);
  });
  loads.set(url, promise);
  void promise.catch(() => loads?.delete(url));
  return promise;
}

/** Lazily load Google Identity Services and the Google API script. */
export async function loadGoogleClients(
  environment: GoogleClientEnvironment = browserEnvironment(),
): Promise<void> {
  await Promise.all([
    loadScript(environment, GOOGLE_IDENTITY_SCRIPT_URL),
    loadScript(environment, GOOGLE_API_SCRIPT_URL),
  ]);
}

/** Lazily load the Picker module after the Google API script has loaded. */
export async function loadGooglePicker(
  environment: GoogleClientEnvironment = browserEnvironment(),
): Promise<void> {
  await loadGoogleClients(environment);
  if (environment.window.google?.picker) return;

  const existing = pickerLoads.get(environment.window);
  if (existing) return existing;
  const gapi = environment.window.gapi;
  if (!gapi) throw new Error("Google API did not initialize after loading.");

  const promise = new Promise<void>((resolve, reject) => {
    gapi.load("picker", {
      callback: resolve,
      onerror: () => reject(new Error("Unable to load Google Picker.")),
    });
  });
  pickerLoads.set(environment.window, promise);
  void promise.catch(() => pickerLoads.delete(environment.window));
  return promise;
}

function requestToken(
  clientId: string,
  prompt: string,
  environment: GoogleClientEnvironment,
): Promise<string> {
  const oauth2 = environment.window.google?.accounts?.oauth2;
  if (!oauth2)
    return Promise.reject(
      new Error("Google Identity Services did not initialize after loading."),
    );

  return new Promise<string>((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_FILE_SCOPE,
      callback: (response) => {
        if (response.access_token) resolve(response.access_token);
        else
          reject(
            new Error(
              response.error ??
                "Google authorization did not return an access token.",
            ),
          );
      },
      error_callback: (error) =>
        reject(
          new Error(
            error.message ?? error.type ?? "Google authorization failed.",
          ),
        ),
    });
    try {
      client.requestAccessToken({ prompt });
    } catch (error) {
      reject(
        error instanceof Error
          ? error
          : new Error("Google authorization failed."),
      );
    }
  });
}

/**
 * Requests an in-memory Drive token. It first attempts a silent reuse and then
 * opens the normal Google consent prompt when reuse is unavailable.
 */
export async function requestGoogleAccessToken(
  configuration: GoogleDriveConfiguration,
  environment: GoogleClientEnvironment = browserEnvironment(),
): Promise<string> {
  const clientId = requireValue(configuration.clientId, "client ID");
  await loadGoogleClients(environment);
  try {
    return await requestToken(clientId, "", environment);
  } catch {
    return requestToken(clientId, "consent", environment);
  }
}

export type GooglePickerOptions = {
  accessToken: string;
  configuration: GoogleDriveConfiguration;
  mode?: "file" | "folder";
};

/** Open a Picker and return the selected file or folder, or null when cancelled. */
export async function pickGoogleDriveFile(
  { accessToken, configuration, mode = "file" }: GooglePickerOptions,
  environment: GoogleClientEnvironment = browserEnvironment(),
): Promise<GoogleDriveFileReference | null> {
  const apiKey = requireValue(configuration.apiKey, "API key");
  const appId = requireValue(configuration.appId, "app ID");
  await loadGooglePicker(environment);
  const picker = environment.window.google?.picker;
  if (!picker)
    throw new Error("Google Picker did not initialize after loading.");

  return new Promise<GoogleDriveFileReference | null>((resolve) => {
    const view = new picker.DocsView(
      mode === "folder" ? picker.ViewId.FOLDERS : picker.ViewId.DOCS,
    );
    if (mode === "folder") {
      view.setIncludeFolders?.(true);
      view.setSelectFolderEnabled?.(true);
    } else {
      view.setMimeTypes?.(supportedGoogleDriveMimeTypes.join(","));
    }

    new picker.PickerBuilder()
      .setDeveloperKey(apiKey)
      .setAppId(appId)
      .setOAuthToken(accessToken)
      .addView(view)
      .setCallback((data) => {
        if (data[picker.Response.ACTION] === picker.Action.CANCEL) {
          resolve(null);
          return;
        }
        if (data[picker.Response.ACTION] !== picker.Action.PICKED) return;
        const document = (
          data[picker.Response.DOCUMENTS] as
            Record<PropertyKey, unknown>[] | undefined
        )?.[0];
        if (!document) {
          resolve(null);
          return;
        }
        resolve({
          id: String(document[picker.Document.ID] ?? ""),
          name: String(document[picker.Document.NAME] ?? ""),
          mimeType: String(document[picker.Document.MIME_TYPE] ?? ""),
        });
      })
      .build()
      .setVisible(true);
  });
}
