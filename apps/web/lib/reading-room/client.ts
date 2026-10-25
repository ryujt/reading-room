import type { ReadingClient } from "@linkwarden/reading-room-ui/client";
import { ReadingError, parseNewLink, type Reading, type ReadingLink, type ReadingPage, type CollectionOption } from "@linkwarden/reading-room-ui/model";

/** Real HTTP only. Each call has a deadline; mutations are never retried automatically. */
export function createRealReadingClient(actorId: number, options: { baseURL?: string; timeoutMs?: number; fetcher?: typeof fetch } = {}): ReadingClient {
  const fetcher = options.fetcher || fetch;
  async function request<T>(path: string, method = "GET", body?: unknown, signal?: AbortSignal): Promise<T> {
    const controller = new AbortController();
    let timedOut = false;
    const abort = () => controller.abort(signal?.reason);
    if (signal?.aborted) abort(); else signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, options.timeoutMs ?? 15_000);
    try {
      const response = await fetcher((options.baseURL || "") + path, { method, signal: controller.signal, credentials: "same-origin", cache: "no-store", headers: body === undefined ? {} : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      const envelope = await response.json();
      if (!response.ok) {
        const error = envelope?.response;
        throw new ReadingError(typeof error === "string" ? error : error?.message || "This request could not be completed.", error?.code || "REQUEST_FAILED", error?.current, response.status);
      }
      if (!envelope || !("response" in envelope)) throw new ReadingError("The server returned an unexpected response.");
      return envelope.response as T;
    } catch (error) {
      if (timedOut) throw new ReadingError(method === "GET" ? "The server took too long. Try again." : "The response timed out. Your change may have reached the server. Your draft is kept; retry a note explicitly, or check the library before saving a link again.", "TIMEOUT");
      if (signal?.aborted || error instanceof ReadingError) throw error;
      throw new ReadingError(method === "GET" ? "Unable to reach the server. Try again." : "The response was interrupted. Your change may have reached the server. Check the library before saving a link again; your note draft is kept.", "NETWORK_ERROR");
    } finally { clearTimeout(timer); signal?.removeEventListener("abort", abort); }
  }
  async function get(id: number, signal?: AbortSignal): Promise<ReadingLink> {
    const response = await request<{ link: Omit<ReadingLink, "reading">; reading: Reading }>(`/api/v1/links/${id}/reading`, "GET", undefined, signal);
    return { ...response.link, reading: response.reading };
  }
  return {
    list(query, signal) { const params = new URLSearchParams({ status: query.status, query: query.query }); if (query.cursor) params.set("cursor", String(query.cursor)); return request<ReadingPage>(`/api/v1/reading-links?${params}`, "GET", undefined, signal); },
    get,
    async put(id, input, signal) { return (await request<{ reading: Reading }>(`/api/v1/links/${id}/reading`, "PUT", input, signal)).reading; },
    async createLink(input, signal) {
      const saved = await request<{ id: number }>("/api/v1/links", "POST", parseNewLink(input), signal);
      try { return await get(saved.id, signal); }
      catch (error) { if (signal?.aborted) throw error; throw new ReadingError(`Link ${saved.id} was saved, but its detail could not be loaded. Close this dialog and refresh your library before creating another link.`, "LINK_SAVED"); }
    },
    async getCollections(signal) {
      const collections = await request<Array<{ id: number; name: string; ownerId: number; members: Array<{ userId: number; canCreate: boolean }> }>>("/api/v1/collections", "GET", undefined, signal);
      return collections.map(collection => ({ id: collection.id, name: collection.name, canCreate: collection.ownerId === actorId || collection.members.some(member => member.userId === actorId && member.canCreate) }) satisfies CollectionOption);
    },
  };
}
