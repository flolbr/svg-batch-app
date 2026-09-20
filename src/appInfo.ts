export const APP_ID =
  typeof __APP_ID__ === "string" && __APP_ID__.trim()
    ? __APP_ID__
    : "svg-batch-generator";

export const APP_VERSION =
  typeof __APP_VERSION__ === "string" && __APP_VERSION__.trim()
    ? __APP_VERSION__
    : "0.0.0";
