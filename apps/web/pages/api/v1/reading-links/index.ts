import type { NextApiRequest, NextApiResponse } from "next";
import verifyUser from "@/lib/api/verifyUser";
import { listReadingLinks } from "@/lib/api/controllers/reading";
import { parseReadingId, readingFailure } from "@/lib/api/readingResponse";
import { parseShelfQuery } from "@linkwarden/reading-room-ui/model";

export default async function readingLinks(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "private, no-store");
  try {
    const user = await verifyUser({ req, res });
    if (!user) return;
    if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).json({ response: { code: "METHOD_NOT_ALLOWED" } }); }
    const query = parseShelfQuery({ status: req.query.status, query: req.query.query, cursor: req.query.cursor === undefined ? undefined : parseReadingId(req.query.cursor) });
    return res.status(200).json({ response: await listReadingLinks(user.id, query) });
  } catch (error) { return readingFailure(res, error); }
}
