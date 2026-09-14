-- CreateTable
CREATE TABLE "MediaExternalAlias" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "mediaItemId" TEXT NOT NULL,
  "providerNamespace" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaExternalAlias_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaExternalAlias_providerNamespace_externalId_key" ON "MediaExternalAlias"("providerNamespace", "externalId");

-- CreateIndex
CREATE INDEX "MediaExternalAlias_mediaItemId_idx" ON "MediaExternalAlias"("mediaItemId");
