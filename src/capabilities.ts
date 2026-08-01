export type Capabilities = {
  fileSystemAccess: boolean;
  indexedDb: boolean;
  hostedOrigin: boolean;
  googleDriveConfigured: boolean;
};

export type GoogleDriveConfiguration = {
  clientId?: string;
  apiKey?: string;
  appId?: string;
  allowedOrigins?: string;
};

export type CapabilityDetectionInput = {
  protocol: string;
  origin: string;
  fileSystemAccess: boolean;
  indexedDb: boolean;
  googleDrive: GoogleDriveConfiguration;
};

function normalizeHttpOrigin(value: string): string | undefined {
  try {
    const url = new URL(value.trim());
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      (url.pathname !== "/" && url.pathname !== "") ||
      url.search ||
      url.hash
    ) {
      return undefined;
    }

    return url.origin;
  } catch {
    return undefined;
  }
}

function hasValue(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

/** Detect capabilities from explicit inputs so hosted-mode rules stay testable. */
export function detectCapabilities({
  protocol,
  origin,
  fileSystemAccess,
  indexedDb,
  googleDrive,
}: CapabilityDetectionInput): Capabilities {
  const hostedOrigin = protocol === "http:" || protocol === "https:";
  const currentOrigin = hostedOrigin ? normalizeHttpOrigin(origin) : undefined;
  const allowedOrigins = (googleDrive.allowedOrigins ?? "")
    .split(",")
    .map((allowedOrigin) => normalizeHttpOrigin(allowedOrigin))
    .filter((allowedOrigin): allowedOrigin is string => Boolean(allowedOrigin));

  const googleDriveConfigured =
    currentOrigin !== undefined &&
    allowedOrigins.includes(currentOrigin) &&
    hasValue(googleDrive.clientId) &&
    hasValue(googleDrive.apiKey) &&
    hasValue(googleDrive.appId);

  return {
    fileSystemAccess,
    indexedDb,
    hostedOrigin,
    googleDriveConfigured,
  };
}

export function googleDriveConfigurationFromEnv(
  env: Record<string, string | undefined>,
): GoogleDriveConfiguration {
  return {
    clientId: env.VITE_GOOGLE_CLIENT_ID,
    apiKey: env.VITE_GOOGLE_API_KEY,
    appId: env.VITE_GOOGLE_APP_ID,
    allowedOrigins: env.VITE_GOOGLE_ALLOWED_ORIGINS,
  };
}

/** Read browser and Vite values at the application boundary. */
export function detectBrowserCapabilities(): Capabilities {
  const browserWindow =
    typeof window === "undefined"
      ? undefined
      : (window as Window & {
          showOpenFilePicker?: unknown;
          showSaveFilePicker?: unknown;
        });

  return detectCapabilities({
    protocol: browserWindow?.location.protocol ?? "",
    origin: browserWindow?.location.origin ?? "",
    fileSystemAccess:
      typeof browserWindow?.showOpenFilePicker === "function" ||
      typeof browserWindow?.showSaveFilePicker === "function",
    indexedDb: typeof browserWindow?.indexedDB !== "undefined",
    googleDrive: googleDriveConfigurationFromEnv(import.meta.env),
  });
}
