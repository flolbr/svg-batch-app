import { createTheme } from "@mantine/core";

export const appTheme = createTheme({
  primaryColor: "brand",
  colors: {
    brand: [
      "#edf5ff",
      "#d9e9ff",
      "#b3d2ff",
      "#87b8ff",
      "#5c9fff",
      "#3989f5",
      "#2874db",
      "#1f5fba",
      "#1d5196",
      "#1c4578",
    ],
  },
  defaultRadius: "sm",
  fontFamily:
    "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  headings: {
    fontFamily: "inherit",
  },
});
