import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { notifications, Notifications } from "@mantine/notifications";
import { App } from "./App";
import { AppErrorBoundary } from "./AppErrorBoundary";
import { loadEmbeddedProject } from "./project/loadProject";
import {
  deleteRecoveryProject,
  loadRecoveryProject,
} from "./project/recoveryStore";
import { isRecoveryNewer } from "./project/startupRecovery";
import { useAppStore } from "./store";
import "./styles.css";
import { appTheme } from "./theme";

const cleanProjectDocument = document.cloneNode(true) as Document;

async function startApplication() {
  const projectResult = loadEmbeddedProject(document);
  let recoveryError: string | null = null;

  if (projectResult.success) {
    let project = projectResult.project;
    try {
      const recovery = await loadRecoveryProject(project.projectId);
      if (isRecoveryNewer(project, recovery)) {
        const shouldRecover = window.confirm(
          `A newer browser recovery snapshot is available for “${project.name}”. Recover it now?`,
        );
        if (shouldRecover) {
          project = recovery;
        } else {
          await deleteRecoveryProject(project.projectId);
        }
      }
    } catch (error) {
      recoveryError =
        error instanceof Error
          ? error.message
          : "Browser recovery could not be checked.";
    }
    useAppStore.getState().setProject(project);
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <MantineProvider defaultColorScheme="light" theme={appTheme}>
        <Notifications limit={3} position="top-right" />
        <AppErrorBoundary>
          <App projectDocument={cleanProjectDocument} />
        </AppErrorBoundary>
      </MantineProvider>
    </React.StrictMode>,
  );

  if (!projectResult.success) {
    notifications.show({
      autoClose: false,
      color: "red",
      message: projectResult.error,
      title: "Project could not be loaded",
    });
  } else if (recoveryError) {
    notifications.show({
      color: "orange",
      message: recoveryError,
      title: "Browser recovery is unavailable",
    });
  }
}

void startApplication();
