import { readReadingLocation, readingLocationURL } from "@linkwarden/reading-room-ui/model";
/** Only this product's route and known query keys can be a viewer return destination. */
export function readingReturnTo(value: unknown): string | null {
  if (typeof value !== "string" || value.includes("\\") || !/^\/reading-room(?:\?|$)/.test(value)) return null;
  try {
    const url = new URL(value, "https://reading-room.invalid");
    if (url.pathname !== "/reading-room" || url.hash || Array.from(url.searchParams.keys()).some(key => !["link", "status", "query"].includes(key))) return null;
    return readingLocationURL(readReadingLocation(url.search), "/reading-room");
  } catch { return null; }
}
