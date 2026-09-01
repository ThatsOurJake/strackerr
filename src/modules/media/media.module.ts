import { Module } from "@nestjs/common";
import { MetadataModule } from "../metadata/metadata.module";
import { EpisodeSyncService } from "./episode-sync.service";
import { IdentificationService } from "./identification.service";
import { MediaService } from "./media.service";

@Module({
  imports: [MetadataModule],
  providers: [MediaService, EpisodeSyncService, IdentificationService],
  exports: [MediaService, IdentificationService],
})
export class MediaModule {}
