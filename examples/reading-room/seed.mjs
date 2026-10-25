import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { Actor, expectStatus } from "./http.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const home = process.env.READING_ROOM_HOME || path.resolve(repo, "../.local-rebuild/reading-room-r2");
const configFile = path.join(home, "fixtures.json");
await fs.mkdir(home, { recursive: true, mode: 0o700 });
let config;
try { config = JSON.parse(await fs.readFile(configFile, "utf8")); }
catch (error) { if (error.code !== "ENOENT") throw error; }
if (!config) {
  config = { baseUrl: "http://127.0.0.1:4721", actors: Object.fromEntries(["owner", "member", "outsider"].map(role => [role, { username: role === "owner" ? "reader" : `reading-${role}`, password: crypto.randomBytes(18).toString("base64url") }])), linkIds: {}, articleIds: [] };
}
const save = () => fs.writeFile(configFile, JSON.stringify(config, null, 2) + "\n", { mode: 0o600 });
await save(); await fs.chmod(configFile, 0o600);
if (config.seedComplete) { console.log("Fixtures already complete; existing reading notes preserved."); process.exit(0); }

const actors = {};
for (const [role, credentials] of Object.entries(config.actors)) {
  const actor = new Actor(config.baseUrl); actors[role] = actor;
  if (!credentials.id) {
    const result = await actor.request("/api/v1/users", "POST", { ...credentials, name: role === "owner" ? "Ryu" : `Reading ${role}` });
    if (result.status === 201) credentials.id = result.data.id;
    else if (result.status !== 400) expectStatus(result, 201, `Register ${role}`);
  }
  const user = await actor.login(credentials);
  credentials.id ||= user.id;
  await save();
}
const owner = actors.owner;
if (!config.sharedCollectionId) { config.sharedCollectionId = expectStatus(await owner.request("/api/v1/collections", "POST", { name: "Reading Room", description: "Essays and ideas worth spending a little time with." }), 200, "Create reading collection").id; await save(); }
if (!config.publicCollectionId) { config.publicCollectionId = expectStatus(await owner.request("/api/v1/collections", "POST", { name: "Open shelf", description: "Shared articles. Personal reading notes remain private." }), 200, "Create public collection").id; await save(); }
expectStatus(await owner.request(`/api/v1/collections/${config.sharedCollectionId}`, "PUT", { id: config.sharedCollectionId, name: "Reading Room", isPublic: false, members: [{ userId: config.actors.member.id, canCreate: false, canUpdate: false, canDelete: false }] }), 200, "Create read-only membership");
expectStatus(await owner.request(`/api/v1/collections/${config.publicCollectionId}`, "PUT", { id: config.publicCollectionId, name: "Open shelf", isPublic: true, members: [] }), 200, "Publish collection fixture");

const articles = [
  ["https://www.w3.org/Provider/Style/URI.html", "Cool URIs don’t change", "The lasting value of an address that continues to work."],
  ["https://paulgraham.com/read.html", "The Need to Read", "An essay to return to when deciding what deserves your attention."],
  ["https://www.w3.org/DesignIssues/Principles.html", "Principles of Design", "Design choices behind an open, connected web."],
  ["https://paulgraham.com/greatwork.html", "Keep Your Identity Small", "A short essay for a slower, more thoughtful reading session."],
  ["https://www.w3.org/People/Berners-Lee/ShortHistory.html", "A Little History of the World Wide Web", "다시 읽고 싶은 웹의 시작 — 연결의 역사를 천천히 살펴보기."],
  ["https://www.w3.org/DesignIssues/LinkedData.html", "Linked Data", "Connecting useful information while keeping room for context."],
];
for (let index = config.articleIds.length; index < articles.length; index++) {
  const [url, name, description] = articles[index];
  const link = expectStatus(await owner.request("/api/v1/links", "POST", { url, name, description, collection: { id: index === 5 ? config.publicCollectionId : config.sharedCollectionId } }), 200, `Save article ${index + 1}`);
  config.articleIds.push(link.id); await save();
}
config.linkIds = { shared: config.articleIds[0], public: config.articleIds[5] };
for (const [index, status, reflection] of [[0, "READING", "A useful link should still make sense years from now."], [1, "READING", "Reading makes room for ideas I would not find alone."], [4, "FINISHED", "연결은 기술이면서 오래 지켜야 할 약속이기도 하다."]]) {
  const id = config.articleIds[index];
  const current = expectStatus(await owner.request(`/api/v1/links/${id}/reading`), 200, "Get initial reading").reading;
  expectStatus(await owner.request(`/api/v1/links/${id}/reading`, "PUT", { status, reflection, expectedVersion: current.version }), 200, "Seed personal reading through API");
}
config.seedComplete = true; await save();
console.log(JSON.stringify({ result: "PASS", accounts: 3, articles: config.articleIds.length, configFile, permissions: "0600", linkIds: config.linkIds }));
