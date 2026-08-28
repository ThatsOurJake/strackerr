-- CreateIndex
CREATE UNIQUE INDEX "MediaItem_parentId_seasonNumber_episodeNumber_key" ON "MediaItem"("parentId", "seasonNumber", "episodeNumber");
