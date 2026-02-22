import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

let devProcess = null;

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      stdio: "inherit",
      env: process.env,
      ...options,
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} failed with code ${code}`));
    });
    child.on("error", reject);
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readEnvValue(filePath, key) {
  if (!fs.existsSync(filePath)) return "";
  const content = fs.readFileSync(filePath, "utf8");
  const match = content.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match?.[1]?.trim() || "";
}

async function waitForFreshApiBase(maxAttempts = 60, intervalMs = 1000) {
  const envLocalPath = path.join(rootDir, ".env.local");
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const apiBase = readEnvValue(envLocalPath, "VITE_API_BASE_URL");
    if (apiBase.startsWith("https://")) {
      try {
        const res = await fetch(`${apiBase}/health`);
        if (res.ok) return apiBase;
      } catch {
        // Keep polling until ngrok/backend are ready.
      }
    }
    await wait(intervalMs);
  }
  return "";
}

function shutdownAndExit(code = 0) {
  if (devProcess && !devProcess.killed) {
    devProcess.kill("SIGTERM");
  }
  setTimeout(() => process.exit(code), 400);
}

process.on("SIGINT", () => shutdownAndExit(0));
process.on("SIGTERM", () => shutdownAndExit(0));

async function main() {
  console.log("[ios:dev] starting backend + frontend + ngrok...");
  devProcess = spawn("npm", ["run", "dev:all"], {
    cwd: rootDir,
    stdio: "inherit",
    env: process.env,
  });

  devProcess.on("exit", (code) => {
    if (code !== 0) {
      console.error(`[ios:dev] dev:all exited early with code ${code}`);
      process.exit(code ?? 1);
    }
  });

  console.log("[ios:dev] waiting for fresh API base URL...");
  const apiBase = await waitForFreshApiBase();
  if (!apiBase) {
    throw new Error("Could not detect a healthy VITE_API_BASE_URL in .env.local");
  }
  console.log(`[ios:dev] using API base: ${apiBase}`);

  console.log("[ios:dev] running iOS sync...");
  await run("npm", ["run", "ios"]);
  const workspacePath = path.join(rootDir, "ios", "App", "App.xcworkspace");
  if (fs.existsSync(workspacePath)) {
    console.log("[ios:dev] iOS sync complete.");
    console.log(`[ios:dev] open Xcode workspace: open "${workspacePath}"`);
    console.log(`[ios:dev] verify API health in browser: ${apiBase}/health`);
  } else {
    console.log("[ios:dev] iOS sync complete, but ios/App/App.xcworkspace was not found.");
    console.log("[ios:dev] run: npx cap add ios");
  }
  console.log("[ios:dev] Dev services are still running. Press Ctrl+C to stop.");
}

main().catch((error) => {
  console.error(`[ios:dev] ${error.message}`);
  shutdownAndExit(1);
});
