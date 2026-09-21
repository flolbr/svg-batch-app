import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { projectSchema } from "../src/project/projectSchema";

const argument = (name: string): string | undefined => {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
};

function projectBlock(html: string, label: string): { start: number; end: number; json: string } {
  const pattern = /<script\b[^>]*\bid=["']svg-batch-project["'][^>]*>([\s\S]*?)<\/script>/gi;
  const matches = [...html.matchAll(pattern)];
  if (matches.length !== 1) {
    throw new Error(`${label} must contain exactly one #svg-batch-project script.`);
  }
  const match = matches[0];
  const start = match.index ?? 0;
  const end = start + match[0].length;
  const json = match[1].trim();
  projectSchema.parse(JSON.parse(json));
  return { start, end, json };
}

function main(): void {
  const input = argument("input");
  if (!input) {
    throw new Error("Usage: bun scripts/repairProjectHtml.ts --input=/path/project.html [--output=/path/repaired.html] [--shell=dist/index.html]");
  }
  const shellPath = argument("shell") || "dist/index.html";
  const outputPath = argument("output") || `${input.replace(/\.html?$/i, "")}.standalone.html`;
  const sourceHtml = readFileSync(resolve(input), "utf8");
  const shellHtml = readFileSync(resolve(shellPath), "utf8");
  const sourceBlock = projectBlock(sourceHtml, "Input project");
  const shellBlock = projectBlock(shellHtml, "Standalone shell");
  const serializedProject = JSON.stringify(JSON.parse(sourceBlock.json)).replaceAll("<", "\\u003c");
  const repaired = `${shellHtml.slice(0, shellBlock.start)}${shellHtml
    .slice(shellBlock.start, shellBlock.end)
    .replace(shellBlock.json, serializedProject)}${shellHtml.slice(shellBlock.end)}`;
  writeFileSync(resolve(outputPath), repaired, "utf8");
  console.log(`Repaired standalone project: ${resolve(outputPath)}`);
}

main();
