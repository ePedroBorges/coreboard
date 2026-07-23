import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const isWindows = process.platform === "win32";
const npmCommand = isWindows ? process.env.ComSpec || "C:\\Windows\\System32\\cmd.exe" : "npm";
const keystorePath = process.env.COREBOARD_KEYSTORE_PATH || join(root, "artifacts", "android", "CoreBoard-upload.keystore");
const required = {
  COREBOARD_KEYSTORE_PATH: keystorePath,
  COREBOARD_KEYSTORE_PASSWORD: process.env.COREBOARD_KEYSTORE_PASSWORD,
  COREBOARD_KEY_ALIAS: process.env.COREBOARD_KEY_ALIAS,
  COREBOARD_KEY_PASSWORD: process.env.COREBOARD_KEY_PASSWORD,
};

for (const [name, value] of Object.entries(required)) {
  if (!value) throw new Error(`${name} nao configurado. AAB release exige um keystore de upload.`);
}
if (!existsSync(keystorePath)) throw new Error(`Keystore nao encontrado: ${keystorePath}`);

function run(label, command, args, env = process.env, cwd = root) {
  console.log(`\n[android-release] ${label}`);
  const result = spawnSync(command, args, { cwd, env, stdio: "inherit", shell: false });
  if (result.status !== 0) {
    const detail = result.error ? `: ${result.error.message}` : ".";
    throw new Error(`${label} falhou com codigo ${result.status ?? "desconhecido"}${detail}`);
  }
}

const npmArgs = isWindows ? ["/d", "/s", "/c", "npm.cmd", "run", "build:android"] : ["run", "build:android"];
run("Build web e sincronizacao Capacitor", npmCommand, npmArgs);

const gradleCommand = isWindows ? join(root, "android", "gradlew.bat") : join(root, "android", "gradlew");
const gradleArgs = [
  "--no-daemon", "--console=plain",
  `-PCOREBOARD_KEYSTORE_PATH=${required.COREBOARD_KEYSTORE_PATH}`,
  `-PCOREBOARD_KEYSTORE_PASSWORD=${required.COREBOARD_KEYSTORE_PASSWORD}`,
  `-PCOREBOARD_KEY_ALIAS=${required.COREBOARD_KEY_ALIAS}`,
  `-PCOREBOARD_KEY_PASSWORD=${required.COREBOARD_KEY_PASSWORD}`,
  "assembleRelease", "bundleRelease",
];
const gradleInvocation = isWindows
  ? ["/d", "/s", "/c", gradleCommand, ...gradleArgs]
  : gradleArgs;
run("Build APK e AAB release assinado", isWindows ? npmCommand : gradleCommand, gradleInvocation, process.env, join(root, "android"));

const output = join(root, "artifacts", "android");
mkdirSync(output, { recursive: true });
const artifacts = [
  [join(root, "android", "app", "build", "outputs", "apk", "release", "app-release.apk"), join(output, "CoreBoard-release.apk")],
  [join(root, "android", "app", "build", "outputs", "bundle", "release", "app-release.aab"), join(output, "CoreBoard-release.aab")],
];
for (const [source, target] of artifacts) {
  if (!existsSync(source)) throw new Error(`Artefato nao encontrado: ${source}`);
  copyFileSync(source, target);
  console.log(`[android-release] ${target} (${statSync(target).size} bytes)`);
}
