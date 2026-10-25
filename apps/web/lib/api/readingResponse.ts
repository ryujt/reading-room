import type { NextApiResponse } from "next";
import { ReadingError, validId } from "@linkwarden/reading-room-ui/model";

export function parseReadingId(value: unknown): number {
  if (typeof value !== "string" || !/^\d+$/.test(value) || !validId(Number(value))) throw new ReadingError("Invalid article ID.", "INVALID_INPUT", undefined, 400);
  return Number(value);
}

export function readingFailure(res: NextApiResponse, error: unknown) {
  if (error instanceof ReadingError) return res.status(error.status || 400).json({ response: { message: error.message, code: error.code, ...(error.current ? { current: error.current } : {}) } });
  // Do not log private reflection payloads or authentication data.
  console.error("Reading Room request failed", error instanceof Error ? error.name : "UnknownError");
  return res.status(500).json({ response: { message: "We couldn’t complete this request. Please try again.", code: "REQUEST_FAILED" } });
}
