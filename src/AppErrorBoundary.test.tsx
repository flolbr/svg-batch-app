import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppErrorBoundary } from "./AppErrorBoundary";

function ThrowOnRender(): never {
  throw new Error("Expected test error");
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AppErrorBoundary", () => {
  it("renders its children when they do not throw", () => {
    render(
      <MantineProvider>
        <AppErrorBoundary>
          <p>Application content</p>
        </AppErrorBoundary>
      </MantineProvider>,
    );

    expect(screen.getByText("Application content")).toBeInTheDocument();
  });

  it("replaces a failed render with the safe reload fallback", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <MantineProvider>
        <AppErrorBoundary>
          <ThrowOnRender />
        </AppErrorBoundary>
      </MantineProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "Something went wrong" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/your saved project data remains safe/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reload application" }),
    ).toBeInTheDocument();
  });
});
