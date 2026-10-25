import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import handleMonolith from "../../apps/worker/lib/preservationScheme/handleMonolith";
import type { Link } from "@linkwarden/prisma/client";

for (const behavior of ["early-exit", "close-stdin-stay-alive"]) test(`Monolith ${behavior} rejects without crashing or orphaning its child`, async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), "reading-monolith-test-"));
  const pidFile = path.join(folder, "pid");
  const script = `#!${process.execPath}\nconst fs=require('node:fs'); fs.writeFileSync(${JSON.stringify(pidFile)}, String(process.pid)); fs.closeSync(0); ${behavior === "early-exit" ? "process.exit(1)" : "setInterval(()=>{},1000)"};\n`;
  await fs.writeFile(path.join(folder, "monolith"), script, { mode: 0o700 });
  const oldPath = process.env.PATH, oldPrivate = process.env.ALLOW_PRIVATE_NETWORK_ACCESS;
  process.env.PATH = folder + path.delimiter + oldPath; process.env.ALLOW_PRIVATE_NETWORK_ACCESS = "true";
  let childPid: number | undefined;
  try {
    const operation = handleMonolith({ id: 0, collectionId: 0, url: "https://example.org" } as Link, `<html><body>${"x".repeat(2_000_000)}</body></html>`, new AbortController().signal);
    await assert.rejects(operation);
    childPid = Number(await fs.readFile(pidFile, "utf8"));
    let alive = true;
    for (let attempt = 0; attempt < 30; attempt++) { try { process.kill(childPid, 0); } catch { alive = false; break; } await delay(20); }
    assert.equal(alive, false, "Failed input must not leave a child running");
  } finally {
    if (childPid) { try { process.kill(childPid, "SIGKILL"); } catch {} }
    process.env.PATH = oldPath; if (oldPrivate === undefined) delete process.env.ALLOW_PRIVATE_NETWORK_ACCESS; else process.env.ALLOW_PRIVATE_NETWORK_ACCESS = oldPrivate;
    await fs.rm(folder, { recursive: true, force: true });
  }
});
