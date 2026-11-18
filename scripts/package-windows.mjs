import { copyFileSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const isWindows = process.platform === "win32";
const npmCommand = isWindows ? process.env.ComSpec || "C:\\Windows\\System32\\cmd.exe" : "npm";
const tempOutput = join(tmpdir(), "vista-task-control-electron-builder");
const finalOutput = join(root, "artifacts", "windows");

function run(label, command, args, env = process.env) {
  console.log(`\n[windows] ${label}`);
  const result = spawnSync(command, args, { cwd: root, env, stdio: "inherit", shell: false });
  if (result.status !== 0) {
    const detail = result.error ? `: ${result.error.message}` : ".";
    throw new Error(`${label} falhou com codigo ${result.status ?? "desconhecido"}${detail}`);
  }
}

const npmArgs = isWindows
  ? ["/d", "/s", "/c", "npm.cmd", "run", "build:desktop"]
  : ["run", "build:desktop"];

run("Build web relativo", npmCommand, npmArgs);

rmSync(tempOutput, { recursive: true, force: true });
const builderCli = join(root, "node_modules", "electron-builder", "cli.js");
run("Empacotamento Electron/NSIS", process.execPath, [
  builderCli,
  "--win",
  "nsis",
  "--publish",
  "never",
  `--config.directories.output=${tempOutput}`,
], {
  ...process.env,
  ELECTRON_BUILDER_COMPRESSION_LEVEL: "3",
});

rmSync(finalOutput, { recursive: true, force: true });
mkdirSync(finalOutput, { recursive: true });

const artifacts = readdirSync(tempOutput, { withFileTypes: true })
  .filter((entry) => entry.isFile() && /\.(exe|blockmap|yml)$/i.test(entry.name));

for (const artifact of artifacts) {
  copyFileSync(join(tempOutput, artifact.name), join(finalOutput, artifact.name));
  console.log(`- ${basename(artifact.name)} (${statSync(join(finalOutput, artifact.name)).size} bytes)`);
}

if (!artifacts.some((artifact) => artifact.name.endsWith(".exe"))) {
  throw new Error(`Instalador .exe nao encontrado em ${tempOutput}.`);
}
