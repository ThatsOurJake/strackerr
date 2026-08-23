-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UserMetadataKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "keyEnc" TEXT NOT NULL,
    "keyIv" TEXT NOT NULL,
    CONSTRAINT "UserMetadataKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MediaItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortTitle" TEXT NOT NULL,
    "isSkeleton" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT,
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
    CONSTRAINT "MediaItem_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MediaItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MediaItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MediaAlias" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mediaItemId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    CONSTRAINT "MediaAlias_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MediaExternalId" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mediaItemId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    CONSTRAINT "MediaExternalId_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LogEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "mediaItemId" TEXT NOT NULL,
    "loggedAt" DATETIME NOT NULL,
    "duration" INTEGER,
    "platform" TEXT,
    "playerCount" INTEGER,
    "won" BOOLEAN,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LogEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LogEntry_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "UserSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "keyHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CachedImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mediaItemId" TEXT NOT NULL,
    "localPath" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CachedImage_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_apiKey_key" ON "User"("apiKey");

-- CreateIndex
CREATE UNIQUE INDEX "UserMetadataKey_userId_provider_key" ON "UserMetadataKey"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAlias_alias_key" ON "MediaAlias"("alias");

-- CreateIndex
CREATE UNIQUE INDEX "MediaExternalId_provider_externalId_key" ON "MediaExternalId"("provider", "externalId");

-- CreateIndex
CREATE INDEX "LogEntry_userId_loggedAt_idx" ON "LogEntry"("userId", "loggedAt");

-- CreateIndex
CREATE INDEX "LogEntry_userId_mediaItemId_loggedAt_idx" ON "LogEntry"("userId", "mediaItemId", "loggedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserSetting_userId_key_key" ON "UserSetting"("userId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE UNIQUE INDEX "CachedImage_mediaItemId_sourceUrl_key" ON "CachedImage"("mediaItemId", "sourceUrl");
