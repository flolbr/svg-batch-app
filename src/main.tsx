import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { App } from "./App";
import { AppErrorBoundary } from "./AppErrorBoundary";
import "./styles.css";
import { appTheme } from "./theme";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MantineProvider defaultColorScheme="light" theme={appTheme}>
      <Notifications limit={3} position="top-right" />
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </MantineProvider>
  </React.StrictMode>,
);
