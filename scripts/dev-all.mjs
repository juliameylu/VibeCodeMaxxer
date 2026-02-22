import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const BACKEND_PORT = Number(process.env.BACKEND_PORT || 8787);
const FRONTEND_PORT = Number(process.env.FRONTEND_PORT || 5173);
const NGROK_BIN = process.env.NGROK_BIN || "ngrok";
const ENV_LOCAL_PATH = path.join(rootDir, ".env.local");

const children = [];

function prefixedLog(prefix, line) {
  process.stdout.write(`[${prefix}] ${line}\n`);
}

function spawnProcess(name, command, args, extraEnv = {}) {
  const child = spawn(command, args, {
    cwd: rootDir,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, ...extraEnv },
  });

  children.push(child);

  child.stdout.on("data", (data) => {
    const text = String(data).trimEnd();
    if (!text) return;
    for (const line of text.split("\n")) prefixedLog(name, line);
  });

  child.stderr.on("data", (data) => {
    const text = String(data).trimEnd();
    if (!text) return;
    for (const line of text.split("\n")) prefixedLog(name, line);
  });

  child.on("exit", (code, signal) => {
    prefixedLog(name, `exited (code=${code ?? "null"}, signal=${signal ?? "null"})`);
  });

  return child;
}

function upsertEnvValue(filePath, key, value) {
  let content = "";
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, "utf8");
  }

  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const keyRegex = new RegExp(`^${escapedKey}=.*$`);
  const lines = content.length ? content.split(/\r?\n/) : [];
  const filtered = lines.filter((line) => !keyRegex.test(line));
  while (filtered.length > 0 && filtered[filtered.length - 1] === "") {
    filtered.pop();
  }
  filtered.push(`${key}=${value}`);
  const normalized = `${filtered.join("\n")}\n`;
  fs.writeFileSync(filePath, normalized, "utf8");
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function findNgrokUrl(maxAttempts = 60, intervalMs = 1000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const res = await fetch("http://127.0.0.1:4040/api/tunnels");
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      const tunnels = Array.isArray(data?.tunnels) ? data.tunnels : [];
      const httpsTunnel = tunnels.find((tunnel) => tunnel?.public_url?.startsWith("https://"));
      if (httpsTunnel?.public_url) return httpsTunnel.public_url;
    } catch (_err) {
      // Ngrok API may not be ready yet.
    }
    await sleep(intervalMs);
  }
  return null;
}

function shutdown(code = 0) {
  prefixedLog("runner", "shutting down child processes...");
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  setTimeout(() => {
    for (const child of children) {
      if (!child.killed) child.kill("SIGKILL");
    }
    process.exit(code);
  }, 1000);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
process.on("uncaughtException", (err) => {
  prefixedLog("runner", `uncaught exception: ${err.message}`);
  shutdown(1);
});

async function main() {
  prefixedLog("runner", `starting ngrok (${NGROK_BIN}) for backend port ${BACKEND_PORT}...`);
  spawnProcess("ngrok", NGROK_BIN, ["http", String(BACKEND_PORT)]);

  const ngrokUrl = await findNgrokUrl();
  if (!ngrokUrl) {
    prefixedLog("runner", "could not detect ngrok URL from http://127.0.0.1:4040/api/tunnels");
    prefixedLog("runner", "keep processes running; set TWILIO_PUBLIC_BASE_URL manually if needed.");
    return;
  }

  upsertEnvValue(ENV_LOCAL_PATH, "TWILIO_PUBLIC_BASE_URL", ngrokUrl);
  upsertEnvValue(ENV_LOCAL_PATH, "VITE_API_BASE_URL", ngrokUrl);
  prefixedLog("runner", `updated .env.local -> TWILIO_PUBLIC_BASE_URL=${ngrokUrl}`);
  prefixedLog("runner", `updated .env.local -> VITE_API_BASE_URL=${ngrokUrl}`);
  prefixedLog("runner", `starting backend on port ${BACKEND_PORT} with fresh env...`);
  spawnProcess("backend", "node", ["backend/server.js"], {
    BACKEND_PORT: String(BACKEND_PORT),
  });

  prefixedLog("runner", `starting frontend on port ${FRONTEND_PORT}...`);
  spawnProcess("frontend", "npm", ["run", "dev:frontend", "--", "--host", "0.0.0.0", "--port", String(FRONTEND_PORT)]);

  prefixedLog("runner", "services are running. Press Ctrl+C to stop all.");
}

main();
