import { execSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function refreshWindowsPath() {
  if (process.platform !== "win32") {
    return process.env.PATH ?? "";
  }
  try {
    const machine = execSync(
      'powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable(\'Path\',\'Machine\')"',
      { encoding: "utf8" },
    ).trim();
    const user = execSync(
      'powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable(\'Path\',\'User\')"',
      { encoding: "utf8" },
    ).trim();
    return [user, machine].filter(Boolean).join(";");
  } catch {
    return process.env.PATH ?? process.env.Path ?? "";
  }
}

function buildEnv() {
  const env = { ...process.env };
  const sep = process.platform === "win32" ? ";" : ":";
  const extras = [
    join(homedir(), ".cargo", "bin"),
    join(process.env.ProgramFiles ?? "C:\\Program Files", "nodejs"),
    join(process.env.APPDATA ?? "", "npm"),
  ].filter((p) => p && existsSync(p));

  const basePath =
    process.platform === "win32" ? refreshWindowsPath() : (env.PATH ?? "");
  env.PATH = [...extras, basePath].filter(Boolean).join(sep);

  if (process.platform === "win32") {
    env.Path = env.PATH;
  }

  return env;
}

const env = buildEnv();

/** On Windows, a previous dev instance may still hold local_cv_builder.exe locked. */
function killStaleDevApp() {
  if (process.platform !== "win32" || !process.argv.includes("dev")) {
    return;
  }
  try {
    execSync("taskkill /F /IM local_cv_builder.exe", { stdio: "ignore" });
  } catch {
    // No running instance — expected on first launch.
  }
}

killStaleDevApp();

const tauriJs = join(root, "node_modules", "@tauri-apps", "cli", "tauri.js");
if (!existsSync(tauriJs)) {
  console.error("Tauri CLI not found. Run: npm install");
  process.exit(1);
}

const child = spawn(process.execPath, [tauriJs, ...process.argv.slice(2)], {
  stdio: "inherit",
  env,
  cwd: root,
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
