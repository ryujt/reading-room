import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { spawnSync, spawn } from "node:child_process";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const home = process.env.READING_ROOM_HOME || path.resolve(repo, "../.local-rebuild/reading-room-r2");
const envFile = path.join(home, "runtime.env");
const container = "reading-room-r2-db", volume = "reading-room-r2-postgres";
const command = process.argv[2];
const baseEnvironment = Object.fromEntries(["PATH", "HOME", "TMPDIR", "LANG", "SHELL"].filter(key => process.env[key]).map(key => [key, process.env[key]]));
function run(executable, args, env = baseEnvironment, options = {}) {
  const result = spawnSync(executable, args, { cwd: repo, env, stdio: "inherit", ...options });
  if (result.status !== 0) throw new Error(`${executable} failed (${result.status ?? result.error?.name})`);
  return result;
}
function environment() {
  if (!fs.existsSync(envFile)) throw new Error("Run init first, or set READING_ROOM_HOME to your private runtime directory.");
  if ((fs.statSync(envFile).mode & 0o077) !== 0) throw new Error("runtime.env must have mode 0600.");
  return { ...baseEnvironment, ...parseEnv(fs.readFileSync(envFile, "utf8")) };
}
function assertOwnContainer() {
  const result = spawnSync("docker", ["inspect", "--format", '{{index .Config.Labels "org.reading-room.rebuild"}}', container], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  if (result.status !== 0 || result.stdout.trim() !== "r2") throw new Error("Expected this rebuild's labeled database container.");
}

if (command === "init") {
  if (fs.existsSync(envFile)) throw new Error("Runtime already initialized; use db-start. Existing private resources are preserved.");
  for (const [kind, name] of [["container", container], ["volume", volume]]) {
    if (spawnSync("docker", [kind, "inspect", name], { stdio: "ignore" }).status === 0) throw new Error(`Refusing to reuse an existing ${kind}: ${name}`);
  }
  fs.mkdirSync(home, { recursive: true, mode: 0o700 });
  fs.mkdirSync(path.join(home, "storage"), { recursive: true, mode: 0o700 });
  const password = crypto.randomBytes(24).toString("hex");
  const values = {
    DATABASE_URL: `postgresql://reading_room:${password}@127.0.0.1:54721/reading_room?schema=public`,
    NEXTAUTH_SECRET: crypto.randomBytes(32).toString("hex"),
    NEXTAUTH_URL: "http://127.0.0.1:4721/api/v1/auth",
    BASE_URL: "http://127.0.0.1:4721",
    NEXT_PUBLIC_CREDENTIALS_ENABLED: "true", NEXT_PUBLIC_DISABLE_REGISTRATION: "false",
    NEXT_PUBLIC_EMAIL_PROVIDER: "false", NEXT_PUBLIC_DEMO: "false",
    STORAGE_FOLDER: path.relative(repo, path.join(home, "storage")),
    MAX_WORKERS: "1", ARCHIVE_TAKE_COUNT: "2", BROWSER_TIMEOUT: "2",
    ALLOW_PRIVATE_NETWORK_ACCESS: "false", NEXT_TELEMETRY_DISABLED: "1",
  };
  fs.writeFileSync(envFile, Object.entries(values).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join("\n") + "\n", { mode: 0o600, flag: "wx" });
  run("docker", ["run", "-d", "--name", container, "--label", "org.reading-room.rebuild=r2", "-p", "127.0.0.1:54721:5432", "-e", "POSTGRES_USER=reading_room", "-e", "POSTGRES_DB=reading_room", "-e", "POSTGRES_PASSWORD", "-v", `${volume}:/var/lib/postgresql/data`, "postgres:16-alpine"], { ...baseEnvironment, POSTGRES_PASSWORD: password });
  console.log(`Private runtime created: ${envFile} (0600). Database: 127.0.0.1:54721.`);
} else if (command === "db-start" || command === "db-stop") {
  assertOwnContainer(); run("docker", [command === "db-start" ? "start" : "stop", container]);
} else {
  const env = environment();
  const commands = {
    generate: ["workspace", "@linkwarden/prisma", "generate"],
    migrate: ["workspace", "@linkwarden/prisma", "deploy"],
    dev: ["workspace", "@linkwarden/web", "dev", "-H", "127.0.0.1", "-p", "4721"],
    build: ["workspace", "@linkwarden/web", "build"],
    start: ["workspace", "@linkwarden/web", "start", "-H", "127.0.0.1", "-p", "4721"],
    worker: ["workspace", "@linkwarden/worker", "exec", "tsx", "worker.ts"],
  };
  if (!commands[command]) throw new Error("Usage: node scripts/reading-room.mjs init|db-start|db-stop|generate|migrate|dev|build|start|worker");
  env.PATH = path.join(home, "bin") + path.delimiter + env.PATH;
  const child = spawn("corepack", ["yarn", ...commands[command]], { cwd: repo, env, stdio: "inherit", detached: process.platform !== "win32" });
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { if (process.platform === "win32") child.kill(signal); else process.kill(-child.pid, signal); });
  child.on("exit", code => process.exit(code ?? 1));
}
