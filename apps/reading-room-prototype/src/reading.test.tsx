import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { INT_MAX, parseReadingInput, parseShelfQuery, ReadingError, type Reading, type ReadingClient, type ReadingLink, type ReadingLocation, type ReadingNavigation } from "@linkwarden/reading-room-ui";
import { useReadingRoom } from "../../../packages/reading-room-ui/useReadingRoom";
import { FakeReadingClient } from "./fakeClient";

const emptyLocation: ReadingLocation = { status: "ALL", query: "", linkId: null };
const link: ReadingLink = { id: 106, name: "One article", url: "https://example.org", description: "A thought", collection: { id: 7, name: "Shelf" }, createdAt: "2026-10-25T00:00:00.000Z", readable: null, pdf: null, image: null, monolith: null, reading: { status: "UNREAD", reflection: "", version: 0, updatedAt: null } };
const changed: Reading = { status: "READING", reflection: "A draft", version: 1, updatedAt: "2026-10-25T01:00:00.000Z" };
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (error: unknown) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function clientFixture(): ReadingClient { return { list: vi.fn().mockResolvedValue({ items: [link], counts: { ALL: 1, UNREAD: 1, READING: 0, FINISHED: 0 }, nextCursor: null }), get: vi.fn().mockResolvedValue(link), put: vi.fn().mockResolvedValue(changed), createLink: vi.fn().mockResolvedValue(link), getCollections: vi.fn().mockResolvedValue([{ id: 7, name: "Shelf", canCreate: true }]) }; }
function navigationFixture(linkId: number | null = 106) { const apply = vi.fn(); const navigation: ReadingNavigation = { read: () => ({ ...emptyLocation, linkId }), to: (location, label) => ({ location, label, apply }), external: (_url, label) => ({ label, apply }), subscribe: () => () => {} }; return { navigation, apply }; }

describe("browser controller ownership and draft recovery", () => {
  let root: Root;
  let container: HTMLDivElement;
  let room: ReturnType<typeof useReadingRoom>;
  function Harness({ client, navigation, actor }: { client: ReadingClient; navigation: ReadingNavigation; actor: string }) { room = useReadingRoom(client, navigation, actor); return null; }
  beforeEach(() => { (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true; container = document.createElement("div"); document.body.append(container); root = createRoot(container); });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
  async function mount(client: ReadingClient, navigation: ReadingNavigation, actor = "A") { await act(async () => root.render(<Harness key={actor} actor={actor} client={client} navigation={navigation}/>)); }

  it("R-P-1 blocks loading the server value while an explicit overwrite is pending", async () => {
    const client = clientFixture(), { navigation } = navigationFixture();
    const server: Reading = { ...changed, reflection: "Saved elsewhere", version: 2 };
    const pending = deferred<Reading>();
    vi.mocked(client.put).mockRejectedValueOnce(new ReadingError("Changed", "READING_CONFLICT", server, 409)).mockImplementationOnce(() => pending.promise);
    await mount(client, navigation);
    await act(async () => room.editDraft({ status: "READING", reflection: "A draft" }));
    await act(async () => { await room.saveDraft(); });
    expect(room.conflict).toEqual(server);
    let save!: Promise<boolean>;
    await act(async () => { save = room.saveDraft(server.version); });
    await act(async () => room.useServerValue());
    expect(room.draft.reflection).toBe("A draft");
    await act(async () => { pending.resolve({ ...changed, version: 3 }); await save; });
    expect(room.draft.reflection).toBe("A draft");
  });

  it("R-P-2 prevents a previous actor's deferred Save and leave from navigating", async () => {
    const first = clientFixture(), second = clientFixture(), { navigation, apply } = navigationFixture();
    const pending = deferred<Reading>(); first.put = vi.fn(() => pending.promise);
    await mount(first, navigation);
    await act(async () => room.editDraft({ status: "READING", reflection: "A draft" }));
    await act(async () => room.go(emptyLocation, "library"));
    let save!: Promise<void>;
    await act(async () => { save = room.resolveNavigation("save"); });
    await mount(second, navigation, "B");
    await act(async () => { pending.resolve(changed); await save; });
    expect(apply).not.toHaveBeenCalled();
    expect(room.draft.reflection).toBe("");
  });

  it("R-P-2 prevents a previous actor's deferred link create from navigating", async () => {
    const first = clientFixture(), { navigation, apply } = navigationFixture(null);
    const pending = deferred<ReadingLink>(); first.createLink = vi.fn(() => pending.promise);
    await mount(first, navigation);
    let save!: Promise<void>;
    await act(async () => { save = room.saveLink({ url: "https://example.net", name: "New", collection: { id: 7 } }); });
    await mount(clientFixture(), navigation, "B");
    await act(async () => { pending.resolve(link); await save; });
    expect(apply).not.toHaveBeenCalled();
  });

  it("R-P-3 blocks create after collection failure and permits an explicit retry", async () => {
    const client = clientFixture(), { navigation } = navigationFixture(null);
    vi.mocked(client.getCollections).mockRejectedValueOnce(new Error("Collections unavailable"));
    await mount(client, navigation);
    await act(async () => room.openSave());
    expect(room.collectionsError).toBe("Collections unavailable");
    await act(async () => { await room.saveLink({ url: "https://example.net", name: "New", collection: { id: 7 } }); });
    expect(client.createLink).not.toHaveBeenCalled();
    await act(async () => { await room.loadCollections(); });
    expect(room.collectionsError).toBe("");
    expect(room.collections).toHaveLength(1);
  });

  it("failed Save and leave retains both draft and destination, then retry navigates", async () => {
    const client = clientFixture(), { navigation, apply } = navigationFixture();
    vi.mocked(client.put).mockRejectedValueOnce(new Error("Cannot confirm save"));
    await mount(client, navigation);
    await act(async () => room.editDraft({ status: "READING", reflection: "A draft" }));
    await act(async () => room.go(emptyLocation, "library"));
    await act(async () => { await room.resolveNavigation("save"); });
    expect(room.draft.reflection).toBe("A draft"); expect(room.pendingDestination?.label).toBe("library"); expect(apply).not.toHaveBeenCalled();
    await act(async () => { await room.resolveNavigation("save"); });
    expect(apply).toHaveBeenCalledOnce(); expect(room.pendingDestination).toBeNull();
  });

  it("a stale detail response cannot replace a newly selected article", async () => {
    const client = clientFixture(), { navigation } = navigationFixture();
    const first = deferred<ReadingLink>();
    vi.mocked(client.get).mockImplementationOnce(() => first.promise).mockResolvedValueOnce({ ...link, id: 105, name: "Second" });
    await mount(client, navigation);
    await act(async () => room.go({ ...emptyLocation, linkId: 105 }, "second"));
    await act(async () => first.resolve(link));
    expect(room.selected?.id).toBe(105);
  });
});

describe("deterministic fake contract", () => {
  beforeEach(() => vi.useFakeTimers()); afterEach(() => vi.useRealTimers());
  async function finish<T>(promise: Promise<T>): Promise<T> { const result = promise.then(value => ({ value }), error => ({ error })); await vi.runAllTimersAsync(); const resolved = await result; if ("error" in resolved) throw resolved.error; return resolved.value; }
  it("saves status and reflection together, confirms same stale payload, rejects a different stale payload", async () => {
    const client = new FakeReadingClient();
    const input = { status: "FINISHED" as const, reflection: "  One idea  ", expectedVersion: 0 };
    const saved = await finish(client.put(105, input));
    expect(saved).toMatchObject({ status: "FINISHED", reflection: "One idea", version: 1 });
    expect(await finish(client.put(105, input))).toEqual(saved);
    await expect(finish(client.put(105, { ...input, reflection: "A competing idea" }))).rejects.toMatchObject({ code: "READING_CONFLICT", current: saved });
    const page = await finish(client.list({ status: "FINISHED", query: "quiet" }));
    expect(page.items.map(item => item.id)).toEqual([105]); expect(page.counts).toEqual({ ALL: 6, UNREAD: 2, READING: 2, FINISHED: 2 });
  });
  it("reset removes created collections and saved links", async () => {
    const client = new FakeReadingClient();
    await finish(client.createLink({ url: "https://example.com/new", name: "New", collection: { name: "Test shelf" } }));
    expect(await finish(client.getCollections())).toHaveLength(3);
    client.reset();
    expect(await finish(client.getCollections())).toHaveLength(2);
    expect((await finish(client.list({ status: "ALL", query: "" }))).counts.ALL).toBe(6);
  });
  it("consumes a failure once and leaves the stored reading value unchanged", async () => {
    const client = new FakeReadingClient(); client.setMode("fail");
    const input = { status: "READING" as const, reflection: "Try again", expectedVersion: 0 };
    await expect(finish(client.put(105, input))).rejects.toMatchObject({ code: "REQUEST_FAILED" });
    expect((await finish(client.get(105))).reading.version).toBe(0);
    expect((await finish(client.put(105, input))).reflection).toBe("Try again");
  });
});

it("validates exact fields, one-line reflections, and database integer boundaries", () => {
  const input = { status: "UNREAD", reflection: "A thought", expectedVersion: INT_MAX };
  expect(parseReadingInput(input).expectedVersion).toBe(INT_MAX);
  for (const bad of [{ ...input, expectedVersion: INT_MAX + 1 }, { ...input, userId: 9 }, { ...input, reflection: "two\nlines" }, { ...input, reflection: "x".repeat(281) }]) expect(() => parseReadingInput(bad)).toThrow();
  expect(() => parseShelfQuery({ cursor: INT_MAX + 1 })).toThrow();
});
