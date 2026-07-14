import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const isWindows = process.platform === "win32";
const npmCommand = isWindows ? process.env.ComSpec || "C:\\Windows\\System32\\cmd.exe" : "npm";

function run(label, command, args, cwd = root) {
  console.log(`\n[package] ${label}`);
  const result = spawnSync(command, args, { cwd, stdio: "inherit", shell: false });
  if (result.status !== 0) {
    const detail = result.error ? `: ${result.error.message}` : ".";
    throw new Error(`${label} falhou com codigo ${result.status ?? "desconhecido"}${detail}`);
  }
}

function runNpm(label, args) {
  const commandArgs = isWindows ? ["/d", "/s", "/c", "npm.cmd", ...args] : args;
  run(label, npmCommand, commandArgs);
}

runNpm("Geracao do aplicativo Android", ["run", "package:android"]);
runNpm("Geracao do instalador Windows", ["run", "package:windows"]);

console.log("\n[package] Artefatos gerados:");
console.log(`- ${resolve(root, "artifacts", "android")}`);
console.log(`- ${resolve(root, "artifacts", "windows")}`);
