import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const isWindows = process.platform === "win32";
const npmCommand = isWindows ? process.env.ComSpec || "C:\\Windows\\System32\\cmd.exe" : "npm";

function run(label, args) {
  console.log(`\n[android] ${label}`);
  const commandArgs = isWindows ? ["/d", "/s", "/c", "npm.cmd", ...args] : args;
  const result = spawnSync(npmCommand, commandArgs, { cwd: root, stdio: "inherit", shell: false });
  if (result.status !== 0) {
    const detail = result.error ? `: ${result.error.message}` : ".";
    throw new Error(`${label} falhou com codigo ${result.status ?? "desconhecido"}${detail}`);
  }
}

run("Build web", ["run", "build"]);
run("Sincronizacao Capacitor", ["run", "android:sync"]);
run("Build Gradle", ["run", "android:apk"]);

const apkSource = join(root, "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk");
const output = join(root, "artifacts", "android");
const apkTarget = join(output, "VISTA-Task-Control-debug.apk");

if (!existsSync(apkSource)) throw new Error(`APK nao encontrado em ${apkSource}.`);
mkdirSync(output, { recursive: true });
copyFileSync(apkSource, apkTarget);
console.log(`\n[android] ${apkTarget} (${statSync(apkTarget).size} bytes)`);
