export const readingStatuses = ["UNREAD", "READING", "FINISHED"] as const;
export type ReadingStatus = (typeof readingStatuses)[number];
export type Shelf = "ALL" | ReadingStatus;
export const INT_MAX = 2_147_483_647;
export const REFLECTION_LIMIT = 280;

export interface Reading {
  status: ReadingStatus;
  reflection: string;
  version: number;
  updatedAt: string | null;
}
export interface ReadingInput {
  status: ReadingStatus;
  reflection: string;
  expectedVersion: number;
}
export interface ReadingLink {
  id: number;
  name: string;
  url: string;
  description: string;
  collection: { id: number; name: string };
  createdAt: string;
  readable: string | null;
  pdf: string | null;
  image: string | null;
  monolith: string | null;
  reading: Reading;
}
export type ReadingCounts = Record<Shelf, number>;
export interface ReadingPage {
  items: ReadingLink[];
  nextCursor: number | null;
  counts: ReadingCounts;
}
export interface ShelfQuery {
  status: Shelf;
  query: string;
  cursor?: number;
}
export interface ReadingLocation {
  status: Shelf;
  query: string;
  linkId: number | null;
}
export interface CollectionOption { id: number; name: string; canCreate: boolean }
export interface NewLinkInput { url: string; name: string; collection: { id?: number; name?: string } }

export const emptyReading = (): Reading => ({ status: "UNREAD", reflection: "", version: 0, updatedAt: null });
export const emptyCounts = (): ReadingCounts => ({ ALL: 0, UNREAD: 0, READING: 0, FINISHED: 0 });
export const statusLabels: Record<Shelf, string> = { ALL: "All articles", UNREAD: "Unread", READING: "Reading", FINISHED: "Finished" };

export class ReadingError extends Error {
  constructor(message: string, public code = "REQUEST_FAILED", public current?: Reading, public status?: number) {
    super(message);
    this.name = "ReadingError";
  }
}

export function validId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= INT_MAX;
}
export function parseReadingInput(value: unknown): ReadingInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ReadingError("Check your reading note.", "INVALID_INPUT", undefined, 400);
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some(key => !["status", "reflection", "expectedVersion"].includes(key))) throw new ReadingError("Unknown reading field.", "INVALID_INPUT", undefined, 400);
  if (!readingStatuses.includes(input.status as ReadingStatus)) throw new ReadingError("Choose a reading status.", "INVALID_INPUT", undefined, 400);
  if (typeof input.reflection !== "string") throw new ReadingError("Write your note as text.", "INVALID_INPUT", undefined, 400);
  const reflection = input.reflection.trim();
  if (reflection.length > REFLECTION_LIMIT || /[\r\n]/.test(reflection)) throw new ReadingError("Keep your reflection to one line, up to 280 characters.", "INVALID_INPUT", undefined, 400);
  const expectedVersion = input.expectedVersion;
  if (typeof expectedVersion !== "number" || !Number.isInteger(expectedVersion) || expectedVersion < 0 || expectedVersion > INT_MAX) throw new ReadingError("Invalid reading version.", "INVALID_INPUT", undefined, 400);
  return { status: input.status as ReadingStatus, reflection, expectedVersion };
}
export function parseShelfQuery(value: Record<string, unknown>): ShelfQuery {
  const status = value.status ?? "ALL";
  const query = value.query ?? "";
  const cursor = value.cursor;
  if (!["ALL", ...readingStatuses].includes(status as Shelf) || typeof query !== "string" || query.length > 200 || (cursor !== undefined && !validId(cursor))) throw new ReadingError("Invalid library filter.", "INVALID_INPUT", undefined, 400);
  return { status: status as Shelf, query: query.trim(), ...(cursor === undefined ? {} : { cursor: cursor as number }) };
}
export function matchesReadingPayload(reading: Reading, draft: Pick<Reading, "status" | "reflection">) {
  return reading.status === draft.status && reading.reflection === draft.reflection.trim();
}
export function parseNewLink(value: NewLinkInput): NewLinkInput {
  let url: URL;
  try { url = new URL(value.url.trim()); } catch { throw new ReadingError("Enter a complete URL, including https://.", "INVALID_INPUT"); }
  if (!["https:", "http:"].includes(url.protocol)) throw new ReadingError("Use an http or https link.", "INVALID_INPUT");
  if (value.collection.id !== undefined && !validId(value.collection.id)) throw new ReadingError("Choose a collection.", "INVALID_INPUT");
  if (value.collection.id === undefined && !value.collection.name?.trim()) throw new ReadingError("Give your new collection a name.", "INVALID_INPUT");
  return { url: url.href, name: value.name.trim(), collection: value.collection.id ? { id: value.collection.id } : { name: value.collection.name!.trim() } };
}
export function readReadingLocation(search: string): ReadingLocation {
  const params = new URLSearchParams(search);
  const status = params.get("status") || "ALL";
  const linkId = Number(params.get("link"));
  return { status: ["ALL", ...readingStatuses].includes(status as Shelf) ? status as Shelf : "ALL", query: (params.get("query") || "").slice(0, 200), linkId: validId(linkId) ? linkId : null };
}
export function readingLocationURL(location: ReadingLocation, pathname: string) {
  const params = new URLSearchParams();
  if (location.status !== "ALL") params.set("status", location.status);
  if (location.query) params.set("query", location.query);
  if (location.linkId) params.set("link", String(location.linkId));
  return pathname + (params.size ? `?${params}` : "");
}
export function availableFormat(path: string | null) { return Boolean(path && path !== "unavailable"); }

/** Stored/imported links are untrusted too; original-file uploads may have no URL. */
export function sourceArticleURL(value: string): string | null {
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.href : null; } catch { return null; }
}
