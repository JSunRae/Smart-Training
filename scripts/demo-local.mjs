import assert from "node:assert/strict";
import { execFile, execFileSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createWriteStream, existsSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const exec = promisify(execFile);
const host = "127.0.0.1";

export function parsePorts(args = []) {
  const ports = { web: 4310, api: 4311 };
  for (let index = 0; index < args.length; index += 2) {
    const key = { "--web-port": "web", "--api-port": "api" }[args[index]];
    const value = Number(args[index + 1]);
    assert.ok(key && /^\d+$/.test(args[index + 1] || ""), "Use --web-port N and --api-port N");
    assert.ok(Number.isInteger(value) && value >= 1024 && value <= 65535, "Invalid local port");
    ports[key] = value;
  }
  assert.notEqual(ports.web, ports.api, "Web and API ports must differ");
  return ports;
}

export function canCopySource(relative) {
  const normalized = relative.replaceAll("\\", "/");
  const parts = normalized.split("/");
  if (parts.some((part) => /^(?:\.\.|\.env.*|node_modules|\.next)$/i.test(part))) return false;
  if (parts.some((part) => part.toLowerCase() === "data")) {
    return normalized === "apps/api/data/seed-data.json";
  }
  return /^(?:apps\/(?:api|web)|packages)\//.test(normalized);
}

export function demoEnvironment(base, apiPort) {
  // Do not inherit provider credentials, NODE_OPTIONS, or application settings.
  const env = Object.fromEntries(
    Object.entries(base).filter(([key]) =>
      /^(?:PATH|PATHEXT|SYSTEMROOT|SYSTEMDRIVE|WINDIR|COMSPEC|TEMP|TMP|HOME|USERPROFILE|APPDATA|LOCALAPPDATA|LANG)$/i.test(
        key
      )
    )
  );
  return {
    ...env,
    NODE_ENV: "development",
    NEXT_TELEMETRY_DISABLED: "1",
    DATABASE_URL: "",
    ALLOW_FILE_STORAGE_IN_PRODUCTION: "false",
    OPENAI_API_KEY: "",
    OPENAI_API_BASE_URL: "",
    OPENAI_TEXT_ENABLED: "false",
    VOICE_LAB_ENABLED: "false",
    SESSION_RETENTION_DAYS: "30",
    SMART_TRAINING_DB_PATH: "demo-store.json",
    APP_SESSION_SECRET: randomBytes(32).toString("base64url"),
    DATA_ENCRYPTION_KEY: randomBytes(32).toString("hex"),
    INTERNAL_API_ORIGIN: `http://${host}:${apiPort}`,
    NEXT_PUBLIC_API_ORIGIN: `http://${host}:${apiPort}`,
    INTERNAL_API_HOSTPORT: "",
    NEXT_PUBLIC_SUPPORT_EMAIL: "Jason_C_Rae@Outlook.com",
    NEXT_PUBLIC_SUPPORT_URL: "",
    NEXT_PUBLIC_SUPPORT_NAME: "Smart Training Pilot Support"
  };
}

export async function requireFreePort(port) {
  await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", () =>
      reject(
        new Error(`Port ${port} is occupied; choose another port. No existing service was stopped.`)
      )
    );
    probe.listen(port, host, () => probe.close(resolve));
  });
}

export async function startDemo(ports = parsePorts(), { signal } = {}) {
  signal?.throwIfAborted();
  const [major, minor] = process.versions.node.split(".").map(Number);
  assert.ok(major === 22 && minor >= 18, "Use Node 22.18 or newer within Node 22 (not Node 24).");
  await requireFreePort(ports.web);
  await requireFreePort(ports.api);
  const output = path.join(root, "test-results");
  await mkdir(output, { recursive: true });
  const directory = await mkdtemp(path.join(output, "local-demo-"));
  const files = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z", "apps", "packages"],
    {
      cwd: root,
      encoding: "utf8"
    }
  )
    .split("\0")
    .filter(Boolean)
    .filter(canCopySource)
    .filter((relative) => existsSync(path.join(root, relative)));
  files.push("package.json", "pnpm-workspace.yaml", "tsconfig.json");
  for (const relative of files) {
    signal?.throwIfAborted();
    const destination = path.join(directory, relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(path.join(root, relative), destination);
  }
  for (const relative of ["node_modules", "apps/api/node_modules", "apps/web/node_modules"]) {
    await symlink(
      path.join(root, relative),
      path.join(directory, relative),
      process.platform === "win32" ? "junction" : "dir"
    );
  }
  const revision = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8"
  }).trim();
  await writeFile(
    path.join(directory, "manifest.json"),
    JSON.stringify(
      {
        revision,
        source:
          "Current tracked and non-ignored new application files copied from the working tree",
        files,
        createdAt: new Date().toISOString(),
        ports,
        syntheticOnly: true
      },
      null,
      2
    )
  );

  const children = [];
  const logs = [];
  const env = demoEnvironment(process.env, ports.api);
  let failure;
  let closing;
  const abort = () => {
    void close().catch((error) => {
      failure = error;
    });
  };
  async function close() {
    if (closing) return closing;
    signal?.removeEventListener("abort", abort);
    closing = (async () => {
      for (const child of children) {
        if (!child.pid || child.exitCode !== null) continue;
        if (process.platform === "win32") {
          await exec("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
            windowsHide: true
          }).catch(() => {});
        } else {
          try {
            process.kill(-child.pid, "SIGTERM");
          } catch {
            /* The owned process may already have stopped. */
          }
        }
      }
      for (const log of logs) log.end();
      const store = path.resolve(directory, "apps/api/data/demo-store.json");
      assert.ok(store.startsWith(`${path.resolve(directory)}${path.sep}`));
      await rm(store, { force: true });
    })();
    return closing;
  }
  signal?.throwIfAborted();
  signal?.addEventListener("abort", abort, { once: true });
  for (const app of ["api", "web"]) {
    const child = spawn(
      process.execPath,
      [
        path.join(root, `apps/${app}/node_modules/next/dist/bin/next`),
        "dev",
        "--webpack",
        "--hostname",
        host,
        "--port",
        String(ports[app])
      ],
      {
        cwd: path.join(directory, `apps/${app}`),
        env,
        windowsHide: true,
        detached: process.platform !== "win32",
        stdio: ["ignore", "pipe", "pipe"]
      }
    );
    const log = createWriteStream(path.join(directory, `${app}.log`));
    child.stdout.pipe(log, { end: false });
    child.stderr.pipe(log, { end: false });
    child.once("error", (error) => {
      failure = error;
    });
    child.once("exit", (code) => {
      if (!closing) failure = new Error(`${app} exited (${code}); see ${directory}`);
    });
    children.push(child);
    logs.push(log);
  }
  try {
    const api = `http://${host}:${ports.api}`;
    const web = `http://${host}:${ports.web}`;
    for (const url of [`${api}/api/health`, `${web}/privacy`]) {
      const deadline = Date.now() + 180_000;
      let ready = false;
      while (Date.now() < deadline && !ready) {
        signal?.throwIfAborted();
        if (failure) throw failure;
        ready = await fetch(url, {
          signal: AbortSignal.any([AbortSignal.timeout(20_000), ...(signal ? [signal] : [])])
        })
          .then((response) => response.ok)
          .catch(() => false);
        if (!ready) await new Promise((resolve) => setTimeout(resolve, 500));
      }
      assert.ok(ready, `Local demo did not become ready: ${url}. See ${directory}`);
    }
    signal?.throwIfAborted();
    const health = await (
      await fetch(`${api}/api/health`, {
        signal: AbortSignal.any([AbortSignal.timeout(20_000), ...(signal ? [signal] : [])])
      })
    ).json();
    assert.equal(health.status, "ok");
    assert.equal(health.storageBackend, "file");
    assert.equal(health.openAiTextEnabled, false);
    assert.equal(health.voiceLabEnabled, false);
    assert.equal(health.openAiApiConfigured, false);
    return { api, web, directory, revision, health, close, failure: () => failure };
  } catch (error) {
    await close();
    throw error;
  }
}

async function main() {
  const controller = new AbortController();
  let demo;
  let monitor;
  async function stop(code) {
    clearInterval(monitor);
    controller.abort();
    if (demo) await demo.close();
    process.exitCode = code;
  }
  const handleStop = () => {
    void stop(0).catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
  };
  process.once("SIGINT", handleStop);
  process.once("SIGTERM", handleStop);
  try {
    demo = await startDemo(parsePorts(process.argv.slice(2)), { signal: controller.signal });
  } catch (error) {
    process.removeListener("SIGINT", handleStop);
    process.removeListener("SIGTERM", handleStop);
    if (controller.signal.aborted && error.name === "AbortError") return;
    throw error;
  }
  if (controller.signal.aborted) return demo.close();
  console.log(
    `Synthetic local demo: ${demo.web}\nNo public access, cloud database or generated AI.\nFresh data is deleted on exit. Press Ctrl+C to stop.\nLogs: ${demo.directory}`
  );
  monitor = setInterval(() => {
    if (!demo.failure()) return;
    console.error(demo.failure().message);
    void stop(1).catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
  }, 1000);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
