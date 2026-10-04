-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "normalizedKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MediaItemTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "mediaItemId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "providerNamespace" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MediaItemTag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MediaItemTag_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MediaItemTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Tag_userId_normalizedKey_key" ON "Tag"("userId", "normalizedKey");

-- CreateIndex
CREATE INDEX "Tag_userId_displayName_idx" ON "Tag"("userId", "displayName");

-- CreateIndex
CREATE UNIQUE INDEX "MediaItemTag_userId_mediaItemId_tagId_source_providerNamespace_key" ON "MediaItemTag"("userId", "mediaItemId", "tagId", "source", "providerNamespace");

-- CreateIndex
CREATE INDEX "MediaItemTag_userId_mediaItemId_idx" ON "MediaItemTag"("userId", "mediaItemId");

-- CreateIndex
CREATE INDEX "MediaItemTag_userId_tagId_idx" ON "MediaItemTag"("userId", "tagId");
