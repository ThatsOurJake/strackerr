-- CreateTable
CREATE TABLE "MediaItemMergeRedirect" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sourceMediaItemId" TEXT NOT NULL,
    "sourceTitle" TEXT NOT NULL,
    "targetMediaItemId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MediaItemMergeRedirect_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MediaItemMergeRedirect_targetMediaItemId_fkey" FOREIGN KEY ("targetMediaItemId") REFERENCES "MediaItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MediaItemMergeRedirectIdentity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "redirectId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    CONSTRAINT "MediaItemMergeRedirectIdentity_redirectId_fkey" FOREIGN KEY ("redirectId") REFERENCES "MediaItemMergeRedirect" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaItemMergeRedirect_sourceMediaItemId_key" ON "MediaItemMergeRedirect"("sourceMediaItemId");

-- CreateIndex
CREATE INDEX "MediaItemMergeRedirect_userId_targetMediaItemId_idx" ON "MediaItemMergeRedirect"("userId", "targetMediaItemId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaItemMergeRedirectIdentity_redirectId_kind_namespace_externalId_key" ON "MediaItemMergeRedirectIdentity"("redirectId", "kind", "namespace", "externalId");
