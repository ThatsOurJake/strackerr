PRAGMA foreign_keys=OFF;

-- Redefine MediaItem with required owner and owner index.
CREATE TABLE "new_MediaItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "sortTitle" TEXT NOT NULL,
  "isSkeleton" BOOLEAN NOT NULL DEFAULT false,
  "createdByUserId" TEXT NOT NULL,
  "parentId" TEXT,
  "seasonNumber" INTEGER,
  "episodeNumber" INTEGER,
  "description" TEXT,
  "imageUrl" TEXT,
  "imageSourceUrl" TEXT,
  "year" INTEGER,
  "duration" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "MediaItem_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MediaItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MediaItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_MediaItem" (
  "id",
  "type",
  "title",
  "sortTitle",
  "isSkeleton",
  "createdByUserId",
  "parentId",
  "seasonNumber",
  "episodeNumber",
  "description",
  "imageUrl",
  "imageSourceUrl",
  "year",
  "duration",
  "createdAt",
  "updatedAt"
)
SELECT
  "id",
  "type",
  "title",
  "sortTitle",
  "isSkeleton",
  "createdByUserId",
  "parentId",
  "seasonNumber",
  "episodeNumber",
  "description",
  "imageUrl",
  "imageSourceUrl",
  "year",
  "duration",
  "createdAt",
  "updatedAt"
FROM "MediaItem";

DROP TABLE "MediaItem";
ALTER TABLE "new_MediaItem" RENAME TO "MediaItem";
CREATE UNIQUE INDEX "MediaItem_parentId_seasonNumber_episodeNumber_key" ON "MediaItem"("parentId", "seasonNumber", "episodeNumber");
CREATE INDEX "MediaItem_createdByUserId_idx" ON "MediaItem"("createdByUserId");

-- Redefine MediaAlias with per-user uniqueness.
CREATE TABLE "new_MediaAlias" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "mediaItemId" TEXT NOT NULL,
  "alias" TEXT NOT NULL,
  CONSTRAINT "MediaAlias_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MediaAlias_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_MediaAlias" ("id", "userId", "mediaItemId", "alias")
SELECT "MediaAlias"."id", "MediaItem"."createdByUserId", "MediaAlias"."mediaItemId", "MediaAlias"."alias"
FROM "MediaAlias"
INNER JOIN "MediaItem" ON "MediaItem"."id" = "MediaAlias"."mediaItemId";

DROP TABLE "MediaAlias";
ALTER TABLE "new_MediaAlias" RENAME TO "MediaAlias";
CREATE UNIQUE INDEX "MediaAlias_userId_alias_key" ON "MediaAlias"("userId", "alias");
CREATE INDEX "MediaAlias_mediaItemId_idx" ON "MediaAlias"("mediaItemId");

-- Redefine MediaExternalId with per-user uniqueness.
CREATE TABLE "new_MediaExternalId" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "mediaItemId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  CONSTRAINT "MediaExternalId_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MediaExternalId_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_MediaExternalId" ("id", "userId", "mediaItemId", "provider", "externalId")
SELECT "MediaExternalId"."id", "MediaItem"."createdByUserId", "MediaExternalId"."mediaItemId", "MediaExternalId"."provider", "MediaExternalId"."externalId"
FROM "MediaExternalId"
INNER JOIN "MediaItem" ON "MediaItem"."id" = "MediaExternalId"."mediaItemId";

DROP TABLE "MediaExternalId";
ALTER TABLE "new_MediaExternalId" RENAME TO "MediaExternalId";
CREATE UNIQUE INDEX "MediaExternalId_userId_provider_externalId_key" ON "MediaExternalId"("userId", "provider", "externalId");
CREATE INDEX "MediaExternalId_mediaItemId_idx" ON "MediaExternalId"("mediaItemId");

-- Redefine MediaExternalAlias with per-user uniqueness.
CREATE TABLE "new_MediaExternalAlias" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "mediaItemId" TEXT NOT NULL,
  "providerNamespace" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaExternalAlias_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MediaExternalAlias_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_MediaExternalAlias" (
  "id",
  "userId",
  "mediaItemId",
  "providerNamespace",
  "externalId",
  "createdAt"
)
SELECT
  "MediaExternalAlias"."id",
  "MediaItem"."createdByUserId",
  "MediaExternalAlias"."mediaItemId",
  "MediaExternalAlias"."providerNamespace",
  "MediaExternalAlias"."externalId",
  "MediaExternalAlias"."createdAt"
FROM "MediaExternalAlias"
INNER JOIN "MediaItem" ON "MediaItem"."id" = "MediaExternalAlias"."mediaItemId";

DROP TABLE "MediaExternalAlias";
ALTER TABLE "new_MediaExternalAlias" RENAME TO "MediaExternalAlias";
CREATE UNIQUE INDEX "MediaExternalAlias_userId_providerNamespace_externalId_key" ON "MediaExternalAlias"("userId", "providerNamespace", "externalId");
CREATE INDEX "MediaExternalAlias_mediaItemId_idx" ON "MediaExternalAlias"("mediaItemId");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
