import type { Prisma } from "@linkwarden/prisma/client";
import { ReadingError } from "@linkwarden/reading-room-ui/model";

export function accessibleLinksWhere(userId: number): Prisma.LinkWhereInput {
  return { collection: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] } };
}

export function readingLinkSelect(userId: number) {
  return {
    id: true, name: true, url: true, description: true, createdAt: true,
    readable: true, pdf: true, image: true, monolith: true,
    collection: { select: { id: true, name: true } },
    readingProgress: { where: { userId }, select: { status: true, reflection: true, version: true, updatedAt: true } },
  } satisfies Prisma.LinkSelect;
}

export async function findAccessibleLink(tx: Prisma.TransactionClient, userId: number, linkId: number) {
  const link = await tx.link.findFirst({ where: { id: linkId, ...accessibleLinksWhere(userId) }, select: readingLinkSelect(userId) });
  if (!link) throw new ReadingError("This article is not available in your library.", "NOT_FOUND", undefined, 404);
  return link;
}
