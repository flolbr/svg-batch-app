import { describe, expect, it } from "vitest";
import {
  detectCapabilities,
  googleDriveConfigurationFromEnv,
  type CapabilityDetectionInput,
} from "./capabilities";

const configuredDrive = {
  clientId: "client-id",
  apiKey: "api-key",
  appId: "app-id",
  allowedOrigins: "https://app.example.com",
};

function detect(overrides: Partial<CapabilityDetectionInput> = {}) {
  return detectCapabilities({
    protocol: "https:",
    origin: "https://app.example.com",
    fileSystemAccess: true,
    indexedDb: true,
    googleDrive: configuredDrive,
    ...overrides,
  });
}

describe("detectCapabilities", () => {
  it("reports browser storage and file-system feature flags", () => {
    expect(detect({ fileSystemAccess: false, indexedDb: false })).toMatchObject({
      fileSystemAccess: false,
      indexedDb: false,
      hostedOrigin: true,
    });
  });

  it("treats HTTP and HTTPS as hosted, but never configures Drive for file URLs", () => {
    expect(detect({ protocol: "http:" }).hostedOrigin).toBe(true);
    expect(
      detect({ protocol: "file:", origin: "null" }),
    ).toMatchObject({ hostedOrigin: false, googleDriveConfigured: false });
  });

  it("requires an exact allow-listed origin while accepting comma-separated entries", () => {
    expect(
      detect({
        origin: "https://app.example.com/",
        googleDrive: {
          ...configuredDrive,
          allowedOrigins: " https://other.example.com , https://app.example.com/ ",
        },
      }).googleDriveConfigured,
    ).toBe(true);
    expect(
      detect({
        origin: "https://not-app.example.com",
      }).googleDriveConfigured,
    ).toBe(false);
  });

  it("requires every Drive deployment identifier", () => {
    for (const googleDrive of [
      { ...configuredDrive, clientId: " " },
      { ...configuredDrive, apiKey: undefined },
      { ...configuredDrive, appId: "" },
      { ...configuredDrive, allowedOrigins: undefined },
    ]) {
      expect(detect({ googleDrive }).googleDriveConfigured).toBe(false);
    }
  });
});

describe("googleDriveConfigurationFromEnv", () => {
  it("maps only the documented Vite configuration", () => {
    expect(
      googleDriveConfigurationFromEnv({
        VITE_GOOGLE_CLIENT_ID: "client",
        VITE_GOOGLE_API_KEY: "key",
        VITE_GOOGLE_APP_ID: "app",
        VITE_GOOGLE_ALLOWED_ORIGINS: "https://app.example.com",
      }),
    ).toEqual({
      clientId: "client",
      apiKey: "key",
      appId: "app",
      allowedOrigins: "https://app.example.com",
    });
  });
});
