import { emptyCounts, emptyReading, matchesReadingPayload, parseNewLink, parseReadingInput, parseShelfQuery, ReadingError } from "@linkwarden/reading-room-ui";
import type { CollectionOption, NewLinkInput, Reading, ReadingClient, ReadingInput, ReadingLink, ReadingPage, ShelfQuery } from "@linkwarden/reading-room-ui";

type Mode = "normal" | "fail" | "conflict" | "timeout";
const collection = { id: 7, name: "A slower internet" };
const articles = [
  { id: 106, name: "A room of your own, on the internet", url: "https://example.com/a-room-of-your-own", description: "On making a small, deliberate place for the things that deserve our attention.", status: "READING", reflection: "A library can be a practice of attention, not just a collection." },
  { id: 105, name: "The quiet art of noticing", url: "https://example.org/quiet-art", description: "What changes when we stop collecting more and begin looking a little closer?", status: "UNREAD", reflection: "" },
  { id: 104, name: "좋은 문장은 오래 머문다 — 다시 읽고 싶은 글을 위한 작은 독서 기록", url: "https://example.net/reading-again", description: "빠르게 지나가는 정보 속에서 나의 속도로 읽고, 한 문장을 남기는 일에 관하여.", status: "FINISHED", reflection: "기억하고 싶은 문장은 읽은 뒤에도 천천히 자란다." },
  { id: 103, name: "Designing for the long now", url: "https://example.com/long-now", description: "A thoughtful look at tools, care, and the things we choose to keep.", status: "UNREAD", reflection: "" },
  { id: 102, name: "Walking is a way of thinking", url: "https://example.org/walking", description: "A field guide to wandering without an itinerary—and finding a thought along the way.", status: "READING", reflection: "Try leaving the phone behind for the first ten minutes." },
  { id: 101, name: "Against an endless feed", url: "https://example.net/endless-feed", description: "The case for a finite shelf, a considered list, and an internet with an ending.", status: "UNREAD", reflection: "" },
] as const;

function seed(): ReadingLink[] {
  return articles.map((article, index) => ({
    id: article.id, name: article.name, url: article.url, description: article.description,
    collection: index === 3 ? { id: 8, name: "Design & craft" } : collection,
    createdAt: `2026-10-${String(24 - index).padStart(2, "0")}T09:00:00.000Z`,
    readable: `archives/7/${article.id}.json`, pdf: index < 3 ? `archives/7/${article.id}.pdf` : null,
    image: null, monolith: index === 0 ? `archives/7/${article.id}.html` : "unavailable",
    reading: { status: article.status, reflection: article.reflection, version: article.status === "UNREAD" ? 0 : 1, updatedAt: article.status === "UNREAD" ? null : "2026-10-24T10:00:00.000Z" },
  }));
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); signal?.removeEventListener("abort", abort); reject(new DOMException("Request cancelled", "AbortError")); };
    const timer = setTimeout(() => { signal?.removeEventListener("abort", abort); resolve(); }, ms);
    if (signal?.aborted) abort(); else signal?.addEventListener("abort", abort, { once: true });
  });
}

/** Deterministic in-memory boundary. No URL, transport, or fallback can reach a service. */
export class FakeReadingClient implements ReadingClient {
  private items = seed();
  private collections: CollectionOption[] = [{ ...collection, canCreate: true }, { id: 8, name: "Design & craft", canCreate: true }];
  private mode: Mode = "normal";
  private mutation = 0;

  reset(empty = false) {
    this.items = empty ? [] : seed(); this.mode = "normal"; this.mutation = 0;
    this.collections = [{ ...collection, canCreate: true }, { id: 8, name: "Design & craft", canCreate: true }];
  }
  setMode(mode: Mode) { this.mode = mode; }

  async list(raw: ShelfQuery, signal?: AbortSignal): Promise<ReadingPage> {
    const query = parseShelfQuery({ ...raw });
    await delay(180, signal);
    const counts = emptyCounts();
    for (const item of this.items) { counts.ALL++; counts[item.reading.status]++; }
    const matches = this.items.filter(item => (query.status === "ALL" || item.reading.status === query.status)
      && (!query.cursor || item.id < query.cursor)
      && `${item.name} ${item.description} ${item.url}`.toLowerCase().includes(query.query.toLowerCase()));
    return structuredClone({ items: matches.slice(0, 30), nextCursor: matches.length > 30 ? matches[29].id : null, counts });
  }
  async get(id: number, signal?: AbortSignal) {
    await delay(150, signal);
    const item = this.items.find(item => item.id === id);
    if (!item) throw new ReadingError("This article is no longer available in your library.", "NOT_FOUND", undefined, 404);
    return structuredClone(item);
  }
  async put(id: number, raw: ReadingInput, signal?: AbortSignal): Promise<Reading> {
    const input = parseReadingInput(raw);
    const mode = this.mode; this.mode = "normal";
    await delay(mode === "timeout" ? 1500 : 350, signal);
    if (mode === "fail") throw new ReadingError("We couldn’t save this time. Your note is still here. Please try again.", "REQUEST_FAILED");
    if (mode === "timeout") throw new ReadingError("We couldn’t confirm the save. Your draft is safe here; retry to check the result.", "TIMEOUT");
    const item = this.items.find(item => item.id === id);
    if (!item) throw new ReadingError("This article is no longer available.", "NOT_FOUND", undefined, 404);
    if (mode === "conflict") item.reading = { ...item.reading, reflection: "A different thought, saved in another tab.", version: item.reading.version + 1, updatedAt: "2026-10-25T10:00:00.000Z" };
    if (matchesReadingPayload(item.reading, input)) return structuredClone(item.reading);
    if (item.reading.version !== input.expectedVersion) throw new ReadingError("This note changed in another tab.", "READING_CONFLICT", structuredClone(item.reading), 409);
    item.reading = { status: input.status, reflection: input.reflection, version: item.reading.version + 1, updatedAt: new Date(Date.UTC(2026, 9, 25, 10, 0, ++this.mutation)).toISOString() };
    return structuredClone(item.reading);
  }
  async createLink(raw: NewLinkInput, signal?: AbortSignal): Promise<ReadingLink> {
    const input = parseNewLink(raw);
    await delay(450, signal);
    if (this.items.some(item => item.url === input.url)) throw new ReadingError("This link is already on your shelf.", "DUPLICATE", undefined, 409);
    let selected = this.collections.find(item => item.id === input.collection.id);
    if (!selected && input.collection.name) {
      selected = { id: Math.max(...this.collections.map(item => item.id)) + 1, name: input.collection.name, canCreate: true };
      this.collections.push(selected);
    }
    if (!selected) throw new ReadingError("Choose an available collection.", "INVALID_COLLECTION");
    const item: ReadingLink = { id: Math.max(106, ...this.items.map(item => item.id)) + 1, url: input.url, name: input.name || new URL(input.url).hostname, description: "A new addition to your reading room.", collection: { id: selected.id, name: selected.name }, createdAt: "2026-10-25T11:00:00.000Z", readable: null, pdf: null, image: null, monolith: null, reading: emptyReading() };
    this.items.unshift(item);
    return structuredClone(item);
  }
  async getCollections(signal?: AbortSignal) { await delay(100, signal); return structuredClone(this.collections); }
}
