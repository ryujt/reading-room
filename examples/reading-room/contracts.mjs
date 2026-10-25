// Actual Next HTTP + fresh PostgreSQL. Direct SQL is only fixture preparation/observation.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { Actor, expectStatus } from "./http.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const home = process.env.READING_ROOM_HOME || path.resolve(repo, "../.local-rebuild/reading-room-r2");
const config = JSON.parse(await fs.readFile(path.join(home, "fixtures.json"), "utf8"));
const env = parseEnv(await fs.readFile(path.join(home, "runtime.env"), "utf8"));
const database = new URL(env.DATABASE_URL);
assert(database.hostname === "127.0.0.1" && database.port === "54721", "Only the fresh task database is allowed");
const prisma = new PrismaClient({ datasourceUrl: env.DATABASE_URL, log: [] });
const nonce = `rr-contract-${crypto.randomBytes(4).toString("hex")}`;
const report = { scope: "Actual Next HTTP and PostgreSQL; no browser or worker claim", results: [], cleanup: [] };
const actors = Object.fromEntries(["owner", "member", "outsider"].map(role => [role, new Actor(config.baseUrl)]));
const guest = new Actor(config.baseUrl);
const collectionIds = [];
let transientUser;
const route = id => `/api/v1/links/${id}/reading`;
const put = (actor, id, status, reflection, expectedVersion) => actor.request(route(id), "PUT", { status, reflection, expectedVersion });
const get = async (actor, id) => expectStatus(await actor.request(route(id)), 200, "Reading GET").reading;
async function check(name, fn) { try { await fn(); report.results.push({ name, result: "PASS" }); } catch (error) { report.results.push({ name, result: "FAIL", reason: error.message }); } }
function membership(id, publicValue, members = []) { return { id, name: nonce, isPublic: publicValue, members: members.map(userId => ({ userId, canCreate: false, canUpdate: false, canDelete: false })) }; }
function assertPrivateKeysAbsent(value) { if (!value || typeof value !== "object") return; for (const [key, child] of Object.entries(value)) { assert(!["readingProgress", "reflection"].includes(key), `Unexpected private field ${key}`); assertPrivateKeysAbsent(child); } }

try {
  await Promise.all(Object.entries(actors).map(([role, actor]) => actor.login(config.actors[role])));
  const owner = actors.owner, member = actors.member;
  const collection = expectStatus(await owner.request("/api/v1/collections", "POST", { name: nonce }), 200, "Create isolated probe collection"); collectionIds.push(collection.id);
  expectStatus(await owner.request(`/api/v1/collections/${collection.id}`, "PUT", membership(collection.id, true, [config.actors.member.id])), 200, "Share probe collection");
  const links = [];
  for (let i = 0; i < 34; i++) links.push(expectStatus(await owner.request("/api/v1/links", "POST", { name: `${nonce}-${i}`, collection: { id: collection.id } }), 200, "Create probe link"));
  const id = links[0].id;
  await check("V-01 no authentication, private cache, absent row defaults", async () => {
    expectStatus(await guest.request("/api/v1/reading-links"), 401, "Guest list");
    const result = await owner.request(route(id));
    assert.match(result.cacheControl, /private.*no-store/);
    assert.deepEqual(expectStatus(result, 200, "Initial note").reading, { status: "UNREAD", reflection: "", version: 0, updatedAt: null });
  });
  await check("V-01 read-only member writes own row without changing owner or shared Link", async () => {
    expectStatus(await put(owner, id, "READING", `${nonce}-owner`, 0), 200, "Owner put");
    expectStatus(await put(member, id, "FINISHED", `${nonce}-member`, 0), 200, "Member put");
    assert.equal((await get(owner, id)).reflection, `${nonce}-owner`);
    assert.equal((await get(member, id)).reflection, `${nonce}-member`);
    assert.equal((await prisma.link.findUniqueOrThrow({ where: { id } })).name, links[0].name);
    assert.equal(await prisma.readingProgress.count({ where: { linkId: id } }), 2);
  });
  await check("V-01 public-only outsider cannot read or write personal state", async () => {
    expectStatus(await actors.outsider.request(route(id)), 404, "Outsider get");
    expectStatus(await put(actors.outsider, id, "READING", "forbidden", 0), 404, "Outsider put");
  });
  await check("V-04 input ownership, one-line limit and Int32 boundaries", async () => {
    for (const body of [{ status: "READING", reflection: "x", expectedVersion: 0, userId: config.actors.member.id }, { status: "INVALID", reflection: "x", expectedVersion: 0 }, { status: "READING", reflection: "two\nlines", expectedVersion: 0 }, { status: "READING", reflection: "x".repeat(281), expectedVersion: 0 }, { status: "READING", reflection: "x", expectedVersion: 2147483648 }]) expectStatus(await owner.request(route(id), "PUT", body), 400, "Invalid body");
    for (const url of [route(2147483648), route(0), "/api/v1/reading-links?cursor=2147483648", "/api/v1/reading-links?status=ALL&status=READING"]) expectStatus(await owner.request(url), 400, "Invalid route query");
  });
  await check("V-02 concurrent first writes produce one row and one conflict", async () => {
    const target = links[1].id;
    const responses = await Promise.all([put(owner, target, "READING", "first contender", 0), put(owner, target, "FINISHED", "second contender", 0)]);
    assert.deepEqual(responses.map(result => result.status).sort(), [200, 409]);
    assert.equal(await prisma.readingProgress.count({ where: { userId: config.actors.owner.id, linkId: target } }), 1);
    const saved = await get(owner, target);
    assert.equal(saved.version, 1);
    const confirm = expectStatus(await put(owner, target, saved.status, saved.reflection, 0), 200, "Lost response retry").reading;
    assert.deepEqual(confirm, saved);
    const updated = await Promise.all([put(owner, target, "READING", "third contender", 1), put(owner, target, "FINISHED", "fourth contender", 1)]);
    assert.deepEqual(updated.map(result => result.status).sort(), [200, 409]);
    assert.equal((await get(owner, target)).version, 2);
  });
  await check("V-02 identical concurrent first payload confirms the same value", async () => {
    const target = links[2].id;
    const results = await Promise.all([put(owner, target, "READING", "same thought", 0), put(owner, target, "READING", "same thought", 0)]);
    assert(results.every(result => result.status === 200));
    assert(results.every(result => result.data.reading.version === 1));
    assert.equal(await prisma.readingProgress.count({ where: { userId: config.actors.owner.id, linkId: target } }), 1);
  });
  await check("V-01 revoke hides prior row; regrant restores only that user's value", async () => {
    expectStatus(await owner.request(`/api/v1/collections/${collection.id}`, "PUT", membership(collection.id, true)), 200, "Revoke membership");
    expectStatus(await member.request(route(id)), 404, "Revoked get");
    expectStatus(await put(member, id, "READING", "blocked", 1), 404, "Revoked put");
    assert.equal(await prisma.readingProgress.count({ where: { userId: config.actors.member.id, linkId: id } }), 1);
    expectStatus(await owner.request(`/api/v1/collections/${collection.id}`, "PUT", membership(collection.id, true, [config.actors.member.id])), 200, "Restore membership");
    assert.equal((await get(member, id)).reflection, `${nonce}-member`);
  });
  await check("V-04 original shared/public endpoints exclude real personal values", async () => {
    for (const [actor, url] of [[owner, `/api/v1/links/${id}`], [guest, `/api/v1/public/links/${id}`], [guest, `/api/v1/public/collections/${collection.id}`]]) {
      const result = await actor.request(url);
      expectStatus(result, 200, "Existing link/collection endpoint");
      assertPrivateKeysAbsent(result.data);
      assert(!result.text.includes(`${nonce}-owner`)); assert(!result.text.includes(`${nonce}-member`));
    }
  });
  await check("V-03 30-row cursor pages, global counts and status filter semantics", async () => {
    const first = expectStatus(await owner.request(`/api/v1/reading-links?query=${nonce}`), 200, "First page");
    assert.equal(first.items.length, 30); assert(first.nextCursor);
    const second = expectStatus(await owner.request(`/api/v1/reading-links?query=${nonce}&cursor=${first.nextCursor}`), 200, "Second page");
    assert.equal(second.items.length, 4); assert.equal(second.nextCursor, null);
    const ids = [...first.items, ...second.items].map(link => link.id);
    assert.equal(new Set(ids).size, 34); assert.deepEqual([...ids].sort((a, b) => b - a), ids);
    assert(first.counts.ALL >= 40); assert.equal(first.counts.ALL, first.counts.UNREAD + first.counts.READING + first.counts.FINISHED);
    const filtered = expectStatus(await owner.request(`/api/v1/reading-links?query=${nonce}&status=READING`), 200, "Reading filter");
    assert(filtered.items.every(item => item.reading.status === "READING")); assert.deepEqual(filtered.counts, first.counts);
  });
  await check("V-03 list/count snapshot remains coherent during concurrent writes", async () => {
    const target = links[3].id;
    let version = 0;
    const writer = async () => { for (let i = 0; i < 20; i++) { const result = expectStatus(await put(owner, target, i % 2 ? "FINISHED" : "READING", `snapshot-${i}`, version), 200, "Snapshot writer"); version = result.reading.version; } };
    const reader = async () => { for (let i = 0; i < 20; i++) { const result = expectStatus(await owner.request("/api/v1/reading-links"), 200, "Snapshot reader"); assert.equal(result.counts.ALL, result.counts.UNREAD + result.counts.READING + result.counts.FINISHED); assert(result.counts.UNREAD >= 0); } };
    await Promise.all([writer(), reader()]);
  });
  await check("V-02 version exhaustion refuses change but confirms an identical value", async () => {
    const target = links[2].id;
    // Boundary setup only: normal product writes cannot reach Int32 max in a practical test.
    await prisma.readingProgress.update({ where: { userId_linkId: { userId: config.actors.owner.id, linkId: target } }, data: { version: 2147483647 } });
    const current = await get(owner, target);
    const failure = await put(owner, target, "FINISHED", "overflow must not commit", current.version);
    expectStatus(failure, 409, "Version exhausted"); assert.equal(failure.data.code, "VERSION_EXHAUSTED"); assert.equal(failure.data.current, undefined);
    expectStatus(await put(owner, target, current.status, current.reflection, 0), 200, "Current value confirmation at limit");
    assert.deepEqual(await get(owner, target), current);
  });
  await check("V-01 original Link deletion cascades personal rows", async () => {
    const target = links[1].id;
    assert.equal(await prisma.readingProgress.count({ where: { linkId: target } }), 1);
    expectStatus(await owner.request(`/api/v1/links/${target}`, "DELETE"), 200, "Delete link");
    assert.equal(await prisma.readingProgress.count({ where: { linkId: target } }), 0);
    expectStatus(await owner.request(route(target)), 404, "Deleted link get");
  });
  await check("V-01 original User deletion cascades its personal rows", async () => {
    const credentials = { username: `${nonce}-user`, password: crypto.randomBytes(18).toString("base64url") };
    const actor = new Actor(config.baseUrl);
    const user = expectStatus(await actor.request("/api/v1/users", "POST", credentials), 201, "Create transient user");
    transientUser = { id: user.id, actor, credentials };
    await actor.login(credentials);
    expectStatus(await owner.request(`/api/v1/collections/${collection.id}`, "PUT", membership(collection.id, true, [config.actors.member.id, user.id])), 200, "Share with transient user");
    expectStatus(await put(actor, id, "READING", "Disposable user note", 0), 200, "Transient personal note");
    expectStatus(await actor.request(`/api/v1/users/${user.id}`, "DELETE", { password: credentials.password }), 200, "Delete own transient account");
    assert.equal(await prisma.user.count({ where: { id: user.id } }), 0); assert.equal(await prisma.readingProgress.count({ where: { userId: user.id } }), 0);
    transientUser = undefined;
  });
} catch (error) { report.results.push({ name: "setup or dependent execution", result: "FAIL", reason: error.message }); }
finally {
  if (transientUser) { const result = await transientUser.actor.request(`/api/v1/users/${transientUser.id}`, "DELETE", { password: transientUser.credentials.password }); report.cleanup.push({ userId: transientUser.id, status: result.status }); }
  for (const id of collectionIds) { const result = await actors.owner.request(`/api/v1/collections/${id}`, "DELETE"); report.cleanup.push({ collectionId: id, status: result.status }); }
  report.cleanup.push({ remainingProbeRows: await prisma.link.count({ where: { name: { startsWith: nonce } } }) });
  await prisma.$disconnect();
  report.at = new Date().toISOString();
  const output = process.argv[2] || path.join(home, "contracts-report.json");
  await fs.writeFile(output, JSON.stringify(report, null, 2) + "\n");
  const passed = report.results.filter(item => item.result === "PASS").length, failed = report.results.length - passed;
  console.log(JSON.stringify({ passed, failed, skipped: 0, report: output, cleanup: report.cleanup }));
  if (failed || report.cleanup.some(item => item.status && item.status !== 200 || item.remainingProbeRows > 0)) process.exitCode = 1;
}
