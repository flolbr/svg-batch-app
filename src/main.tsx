import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { notifications, Notifications } from "@mantine/notifications";
import { App } from "./App";
import { AppErrorBoundary } from "./AppErrorBoundary";
import { loadEmbeddedProject } from "./project/loadProject";
import { useAppStore } from "./store";
import "./styles.css";
import { appTheme } from "./theme";

const cleanProjectDocument = document.cloneNode(true) as Document;
const projectResult = loadEmbeddedProject(document);
if (projectResult.success) {
  useAppStore.getState().setProject(projectResult.project);
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
}
