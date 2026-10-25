import { prisma } from "@linkwarden/prisma";
import { Prisma, type ReadingProgress } from "@linkwarden/prisma/client";
import { emptyReading, INT_MAX, matchesReadingPayload, ReadingError, type Reading, type ReadingInput, type ReadingLink, type ReadingPage, type ShelfQuery } from "@linkwarden/reading-room-ui/model";
import { accessibleLinksWhere, findAccessibleLink, readingLinkSelect } from "../readingPolicy";

type SelectedLink = Awaited<ReturnType<typeof findAccessibleLink>>;
type SelectedReading = Pick<ReadingProgress, "status" | "reflection" | "version" | "updatedAt">;

function toReading(row?: SelectedReading): Reading {
  return row ? { status: row.status, reflection: row.reflection, version: row.version, updatedAt: row.updatedAt.toISOString() } : emptyReading();
}

/** Explicit DTO construction keeps the private relation out of shared upstream serializers. */
export function toReadingDTO(link: SelectedLink): ReadingLink {
  return {
    id: link.id, name: link.name, url: link.url || "", description: link.description,
    collection: { id: link.collection.id, name: link.collection.name }, createdAt: link.createdAt.toISOString(),
    readable: link.readable, pdf: link.pdf, image: link.image, monolith: link.monolith,
    reading: toReading(link.readingProgress[0]),
  };
}

export async function listReadingLinks(userId: number, query: ShelfQuery): Promise<ReadingPage> {
  async function readSnapshot(tx: Prisma.TransactionClient): Promise<ReadingPage> {
    const accessible = accessibleLinksWhere(userId);
    const filters: Prisma.LinkWhereInput[] = [accessible];
    if (query.cursor) filters.push({ id: { lt: query.cursor } });
    if (query.query) filters.push({ OR: ["name", "description", "url"].map(field => ({ [field]: { contains: query.query, mode: "insensitive" } })) });
    if (query.status === "UNREAD") filters.push({ OR: [{ readingProgress: { none: { userId } } }, { readingProgress: { some: { userId, status: "UNREAD" } } }] });
    else if (query.status !== "ALL") filters.push({ readingProgress: { some: { userId, status: query.status } } });
    const links = await tx.link.findMany({ where: { AND: filters }, select: readingLinkSelect(userId), orderBy: { id: "desc" }, take: 31 });
    const total = await tx.link.count({ where: accessible });
    const groups = await tx.readingProgress.groupBy({ by: ["status"], where: { userId, link: accessible }, _count: { _all: true } });
    const count = (status: "READING" | "FINISHED") => groups.find(group => group.status === status)?._count._all || 0;
    const reading = count("READING"), finished = count("FINISHED");
    return { items: links.slice(0, 30).map(toReadingDTO), nextCursor: links.length > 30 ? links[29].id : null, counts: { ALL: total, UNREAD: total - reading - finished, READING: reading, FINISHED: finished } };
  }
  return prisma.$transaction(readSnapshot, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}

export async function getReading(userId: number, linkId: number): Promise<ReadingLink> {
  async function readSingleSnapshot(tx: Prisma.TransactionClient) {
    return toReadingDTO(await findAccessibleLink(tx, userId, linkId));
  }
  return prisma.$transaction(readSingleSnapshot, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}

class ChangedVersion extends Error {}

async function commitReading(tx: Prisma.TransactionClient, userId: number, linkId: number, input: ReadingInput): Promise<Reading> {
  // Access is checked for this request; a concurrent membership revocation is not globally serialized.
  const link = await findAccessibleLink(tx, userId, linkId);
  const current = toReading(link.readingProgress[0]);
  if (matchesReadingPayload(current, input)) return current;
  if (input.expectedVersion !== current.version) throw new ChangedVersion();
  if (current.version === INT_MAX) throw new ReadingError("This note reached its version limit and cannot be changed.", "VERSION_EXHAUSTED", undefined, 409);
  if (current.version === 0) {
    return toReading(await tx.readingProgress.create({ data: { userId, linkId, status: input.status, reflection: input.reflection } }));
  }
  const changed = await tx.readingProgress.updateMany({ where: { userId, linkId, version: input.expectedVersion }, data: { status: input.status, reflection: input.reflection, version: { increment: 1 } } });
  if (changed.count !== 1) throw new ChangedVersion();
  return toReading(await tx.readingProgress.findUniqueOrThrow({ where: { userId_linkId: { userId, linkId } } }));
}

async function resolveConflict(userId: number, linkId: number, input: ReadingInput): Promise<Reading> {
  // Fresh access check also prevents a previous personal row from granting access after revocation.
  const current = (await getReading(userId, linkId)).reading;
  if (matchesReadingPayload(current, input)) return current;
  throw new ReadingError("This note changed in another tab.", "READING_CONFLICT", current, 409);
}

export async function putReading(userId: number, linkId: number, input: ReadingInput): Promise<Reading> {
  try {
    return await prisma.$transaction(tx => commitReading(tx, userId, linkId, input));
  } catch (error) {
    if (error instanceof ChangedVersion || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) return resolveConflict(userId, linkId, input);
    throw error;
  }
}
