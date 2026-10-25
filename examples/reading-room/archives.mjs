// Observe original worker output through original HTTP reads and physical files.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import assert from "node:assert/strict";
import { setTimeout } from "node:timers/promises";
import { Actor, expectStatus } from "./http.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const home = process.env.READING_ROOM_HOME || path.resolve(repo, "../.local-rebuild/reading-room-r2");
const config = JSON.parse(await fs.readFile(path.join(home, "fixtures.json"), "utf8"));
const env = parseEnv(await fs.readFile(path.join(home, "runtime.env"), "utf8"));
const storage = path.resolve(repo, env.STORAGE_FOLDER);
const actor = new Actor(config.baseUrl); await actor.login(config.actors.owner);
if (process.argv.includes("--refresh")) {
  for (const id of config.articleIds) expectStatus(await actor.request(`/api/v1/links/${id}/archive`, "PUT"), 200, "Original archive refresh");
  console.log(JSON.stringify({ refreshed: config.articleIds.length, result: "queued by original marker reset; not completed" }));
  process.exit(0);
}
const deadline = Date.now() + 120000;
let links;
do {
  links = await Promise.all(config.articleIds.map(async id => expectStatus(await actor.request(`/api/v1/links/${id}`), 200, "Original link read")));
  if (links.every(link => link.lastPreserved)) break;
  await setTimeout(1000);
} while (Date.now() < deadline);
assert(links.every(link => link.lastPreserved), "Worker did not mark every fixture within 120 seconds");
const report = { scope: "Original worker, physical files and original authenticated archive HTTP; viewer pixels tested separately", at: new Date().toISOString(), links: [] };
for (const link of links) {
  const result = { id: link.id, lastPreserved: link.lastPreserved, formats: [] };
  for (const [field, format] of [["image", 1], ["pdf", 2], ["readable", 3], ["monolith", 4]]) {
    if (!link[field] || link[field] === "unavailable") { result.formats.push({ field, result: "UNAVAILABLE" }); continue; }
    const file = path.resolve(storage, link[field]);
    assert(file.startsWith(storage + path.sep));
    const bytes = await fs.readFile(file);
    assert(bytes.length > 0);
    const archive = await actor.request(`/api/v1/archives/${link.id}?format=${format}`);
    assert.equal(archive.status, 200);
    if (field === "readable") { const parsed = JSON.parse(bytes.toString()); assert(typeof parsed.content === "string" && parsed.content.length > 100); }
    if (field === "pdf") assert.equal(bytes.subarray(0, 4).toString(), "%PDF");
    if (field === "monolith") assert.match(bytes.toString().slice(0, 1000), /<!doctype|<html/i);
    result.formats.push({ field, result: "PASS", bytes: bytes.length, httpStatus: archive.status });
  }
  report.links.push(result);
}
const output = path.join(home, "archives-report.json"); await fs.writeFile(output, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ links: report.links.length, available: report.links.flatMap(link => link.formats).filter(format => format.result === "PASS").length, unavailable: report.links.flatMap(link => link.formats).filter(format => format.result === "UNAVAILABLE").length, report: output }));
