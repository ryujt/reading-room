CREATE TYPE "ReadingStatus" AS ENUM ('UNREAD', 'READING', 'FINISHED');

CREATE TABLE "ReadingProgress" (
  "userId" INTEGER NOT NULL,
  "linkId" INTEGER NOT NULL,
  "status" "ReadingStatus" NOT NULL DEFAULT 'UNREAD',
  "reflection" TEXT NOT NULL DEFAULT '',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReadingProgress_pkey" PRIMARY KEY ("userId", "linkId")
);

CREATE INDEX "ReadingProgress_userId_status_idx" ON "ReadingProgress"("userId", "status");
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "Link"("id") ON DELETE CASCADE ON UPDATE CASCADE;
