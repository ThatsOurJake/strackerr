import { Module } from "@nestjs/common";
import { MetadataModule } from "../metadata/metadata.module";
import { EpisodeSyncService } from "./episode-sync.service";
import { MediaService } from "./media.service";

@Module({
  imports: [MetadataModule],
  providers: [MediaService, EpisodeSyncService],
  exports: [MediaService],
})
export class MediaModule {}
