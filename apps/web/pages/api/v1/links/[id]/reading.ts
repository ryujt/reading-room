import type { NextApiRequest, NextApiResponse } from "next";
import verifyUser from "@/lib/api/verifyUser";
import { getReading, putReading } from "@/lib/api/controllers/reading";
import { parseReadingId, readingFailure } from "@/lib/api/readingResponse";
import { parseReadingInput, ReadingError } from "@linkwarden/reading-room-ui/model";

export default async function linkReading(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "private, no-store");
  try {
    const user = await verifyUser({ req, res });
    if (!user) return;
    const id = parseReadingId(req.query.id);
    if (req.method === "GET") {
      const { reading, ...link } = await getReading(user.id, id);
      return res.status(200).json({ response: { link, reading } });
    }
    if (req.method === "PUT") {
      if (process.env.NEXT_PUBLIC_DEMO === "true") throw new ReadingError("This instance is read-only.", "READ_ONLY", undefined, 400);
      return res.status(200).json({ response: { reading: await putReading(user.id, id, parseReadingInput(req.body)) } });
    }
    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ response: { code: "METHOD_NOT_ALLOWED" } });
  } catch (error) { return readingFailure(res, error); }
}
