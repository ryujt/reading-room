import { readFile, readdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const app = path.dirname(fileURLToPath(import.meta.url));
const ui = path.resolve(app, "../../packages/reading-room-ui");
const source = (await readdir(ui)).filter(name => /\.tsx?$/.test(name)).map(name => path.join(ui, name));
source.push(path.join(app, "src/main.tsx"), path.join(app, "src/fakeClient.ts"));
const forbidden = /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(|next-auth|@linkwarden\/web|@prisma\/client/g;
const violations = [];
for (const file of source) if ((await readFile(file, "utf8")).match(forbidden)) violations.push(path.relative(app, file));
const js = (await readdir(path.join(app, "dist/assets"))).filter(name => name.endsWith(".js"));
for (const name of js) if ((await readFile(path.join(app, "dist/assets", name), "utf8")).match(forbidden)) violations.push(`dist/assets/${name}`);
const html = await readFile(path.join(app, "dist/index.html"), "utf8");
if (!html.includes("connect-src 'none'")) violations.push("missing CSP connect-src none");
await access(path.join(app, "dist/__review/mobile.html"));
console.log(JSON.stringify({ sourceFiles: source.length, builtJavaScriptFiles: js.length, connectSrcNone: true, mobileReviewWrapper: true, violations }, null, 2));
if (violations.length) process.exitCode = 1;
