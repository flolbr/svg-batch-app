import { describe, expect, it, vi } from "vitest";
import {
  DRIVE_FILE_SCOPE,
  GOOGLE_API_SCRIPT_URL,
  GOOGLE_IDENTITY_SCRIPT_URL,
  loadGoogleClients,
  loadGooglePicker,
  pickGoogleDriveFile,
  requestGoogleAccessToken,
  type GoogleClientEnvironment,
} from "./googleClient";

const configuration = { clientId: "client", apiKey: "key", appId: "app" };

function createEnvironment() {
  const scripts: HTMLScriptElement[] = [];
  const environment = {
    window: {},
    document: {
      createElement: () => ({
        src: "",
        async: false,
        onload: null,
        onerror: null,
      }),
      head: {
        appendChild: (script: HTMLScriptElement) => scripts.push(script),
      },
    },
  } as unknown as GoogleClientEnvironment;
  return { environment, scripts };
}

function finishScripts(scripts: HTMLScriptElement[]) {
  for (const script of scripts) script.onload?.call(script, new Event("load"));
}

describe("Google script loading", () => {
  it("does not load scripts until called and shares concurrent loads", async () => {
    const { environment, scripts } = createEnvironment();
    const first = loadGoogleClients(environment);
    const second = loadGoogleClients(environment);
    expect(scripts.map((script) => script.src)).toEqual([
      GOOGLE_IDENTITY_SCRIPT_URL,
      GOOGLE_API_SCRIPT_URL,
    ]);
    finishScripts(scripts);
    await expect(Promise.all([first, second])).resolves.toEqual([
      undefined,
      undefined,
    ]);
  });

  it("reports script failures and permits a later retry", async () => {
    const { environment, scripts } = createEnvironment();
    const first = loadGoogleClients(environment);
    scripts[0]?.onerror?.call(scripts[0], new Event("error"));
    scripts[1]?.onload?.call(scripts[1], new Event("load"));
    await expect(first).rejects.toThrow("Unable to load Google script");

    const retry = loadGoogleClients(environment);
    expect(scripts).toHaveLength(3);
    scripts[2]?.onload?.call(scripts[2], new Event("load"));
    await expect(retry).resolves.toBeUndefined();
  });

  it("loads Picker through gapi.load once", async () => {
    const { environment, scripts } = createEnvironment();
    const load = vi.fn((_name: string, options: { callback: () => void }) =>
      options.callback(),
    );
    environment.window.gapi = { load };
    const first = loadGooglePicker(environment);
    finishScripts(scripts);
    await first;
    await loadGooglePicker(environment);
    expect(load).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledWith("picker", expect.any(Object));
  });
});

describe("Google OAuth", () => {
  it("uses exactly drive.file, retries interactive consent, and keeps the token local", async () => {
    const { environment, scripts } = createEnvironment();
    const requests: string[] = [];
    const initTokenClient = vi.fn(
      (options: {
        callback: (response: { access_token?: string; error?: string }) => void;
        scope: string;
      }) => ({
        requestAccessToken: ({ prompt }: { prompt?: string } = {}) => {
          requests.push(prompt ?? "");
          if (prompt === "") options.callback({ error: "consent_required" });
          else options.callback({ access_token: "memory-only-token" });
        },
      }),
    );
    environment.window.google = { accounts: { oauth2: { initTokenClient } } };
    const token = requestGoogleAccessToken(configuration, environment);
    finishScripts(scripts);
    await expect(token).resolves.toBe("memory-only-token");
    expect(initTokenClient).toHaveBeenCalledTimes(2);
    expect(
      initTokenClient.mock.calls.map(([options]) => options.scope),
    ).toEqual([DRIVE_FILE_SCOPE, DRIVE_FILE_SCOPE]);
    expect(requests).toEqual(["", "consent"]);
  });

  it("rejects a failed interactive authorization clearly", async () => {
    const { environment, scripts } = createEnvironment();
    environment.window.google = {
      accounts: {
        oauth2: {
          initTokenClient: (options) => ({
            requestAccessToken: () => options.callback({ error: "denied" }),
          }),
        },
      },
    };
    const token = requestGoogleAccessToken(configuration, environment);
    finishScripts(scripts);
    await expect(token).rejects.toThrow("denied");
  });
});

describe("Google Picker", () => {
  function installPicker(environment: GoogleClientEnvironment) {
    let callback: ((data: Record<PropertyKey, unknown>) => void) | undefined;
    const view = {
      setMimeTypes: vi.fn(),
      setIncludeFolders: vi.fn(),
      setSelectFolderEnabled: vi.fn(),
    };
    const builder = {
      setDeveloperKey: vi.fn().mockReturnThis(),
      setAppId: vi.fn().mockReturnThis(),
      setOAuthToken: vi.fn().mockReturnThis(),
      addView: vi.fn().mockReturnThis(),
      setCallback: vi.fn((value) => {
        callback = value;
        return builder;
      }),
      build: vi.fn(() => ({ setVisible: vi.fn() })),
    };
    const picker = {
      PickerBuilder: class {
        constructor() {
          return builder;
        }
      },
      DocsView: class {
        constructor() {
          return view;
        }
      },
      ViewId: { DOCS: "docs", FOLDERS: "folders" },
      Action: { PICKED: "picked", CANCEL: "cancel" },
      Response: { ACTION: "action", DOCUMENTS: "documents" },
      Document: { ID: "id", NAME: "name", MIME_TYPE: "mime" },
    };
    environment.window.gapi = { load: (_name, options) => options.callback() };
    environment.window.google = {
      picker: picker as unknown as NonNullable<
        GoogleClientEnvironment["window"]["google"]
      >["picker"],
    };
    return { callback: () => callback, view, builder, picker };
  }

  it("filters file picks to supported MIME types and returns the compact reference", async () => {
    const { environment, scripts } = createEnvironment();
    const installed = installPicker(environment);
    const selected = pickGoogleDriveFile(
      { accessToken: "token", configuration },
      environment,
    );
    finishScripts(scripts);
    await new Promise((resolve) => setTimeout(resolve, 0));
    installed.callback()?.({
      action: "picked",
      documents: [{ id: "id-1", name: "art.svg", mime: "image/svg+xml" }],
    });
    await expect(selected).resolves.toEqual({
      id: "id-1",
      name: "art.svg",
      mimeType: "image/svg+xml",
    });
    expect(installed.view.setMimeTypes).toHaveBeenCalledWith(
      expect.stringContaining("image/svg+xml"),
    );
  });

  it("configures folder-only selection and returns null on cancel", async () => {
    const { environment, scripts } = createEnvironment();
    const installed = installPicker(environment);
    const selected = pickGoogleDriveFile(
      { accessToken: "token", configuration, mode: "folder" },
      environment,
    );
    finishScripts(scripts);
    await new Promise((resolve) => setTimeout(resolve, 0));
    installed.callback()?.({ action: "cancel" });
    await expect(selected).resolves.toBeNull();
    expect(installed.view.setSelectFolderEnabled).toHaveBeenCalledWith(true);
  });
});
