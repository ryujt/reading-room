import assert from "node:assert/strict";
import http from "node:http";
import { test } from "node:test";
import { createRealReadingClient } from "../../apps/web/lib/reading-room/client";
import { sourceArticleURL } from "@linkwarden/reading-room-ui/model";
import { readingReturnTo } from "../../apps/web/lib/reading-room/returnTo";

test("real HTTP deadline, explicit PUT confirmation, caller abort and no POST retry", async () => {
  let mode = "slow", puts = 0, posts = 0;
  const reading = { status: "READING", reflection: "A retained draft", version: 1, updatedAt: "2026-10-25T00:00:00.000Z" };
  const server = http.createServer((request, response) => {
    request.resume();
    if (request.method === "PUT") puts++;
    if (request.method === "POST") posts++;
    if (mode === "slow") return; // Accept the request, never send a response.
    response.setHeader("Content-Type", "application/json");
    if (mode === "conflict") { response.statusCode = 409; response.end(JSON.stringify({ response: { code: "READING_CONFLICT", message: "Changed", current: reading } })); }
    else response.end(JSON.stringify({ response: { reading } }));
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as import("node:net").AddressInfo;
  const client = createRealReadingClient(1, { baseURL: `http://127.0.0.1:${address.port}`, timeoutMs: 120 });
  const input = { status: "READING" as const, reflection: reading.reflection, expectedVersion: 0 };
  try {
    const started = Date.now();
    await assert.rejects(client.put(1, input), (error: any) => error.code === "TIMEOUT" && /may have reached/.test(error.message));
    assert(Date.now() - started < 2000); assert.equal(puts, 1);
    mode = "success";
    assert.deepEqual(await client.put(1, input), reading); assert.equal(puts, 2);
    mode = "conflict";
    await assert.rejects(client.put(1, input), (error: any) => error.code === "READING_CONFLICT" && error.current.version === 1);
    mode = "slow";
    const controller = new AbortController(); const waiting = client.get(1, controller.signal); controller.abort();
    await assert.rejects(waiting, (error: any) => error.name === "AbortError");
    await assert.rejects(client.createLink({ url: "https://example.org", name: "Saved", collection: { id: 1 } }), (error: any) => error.code === "TIMEOUT");
    assert.equal(posts, 1);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});

test("viewer return destination only accepts the reading route", () => {
  for (const value of ["https://example.org", "//example.org", "/reading-room/other", "/reading-room?redirect=https://example.org", "/reading-room#other", "/reading-room\\evil", ["/reading-room"]]) assert.equal(readingReturnTo(value), null);
  assert.equal(readingReturnTo("/reading-room"), "/reading-room");
  assert.equal(readingReturnTo("/reading-room?link=2&status=READING"), "/reading-room?status=READING&link=2");
});

test("stored source URL rejects non-web protocols and absent upload URLs", () => {
  for (const value of ["", "javascript:alert(1)", "data:text/html,test", "file:///tmp/file", "//example.org"]) assert.equal(sourceArticleURL(value), null);
  assert.equal(sourceArticleURL("https://example.org/article"), "https://example.org/article");
  assert.equal(sourceArticleURL("http://example.org/article"), "http://example.org/article");
});
