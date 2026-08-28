import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { LogModule } from "../activity/log.module";
import { MediaModule } from "../media/media.module";
import { StatsModule } from "../stats/stats.module";
import { ApiV1LogController } from "./api-v1-log.controller";
import { ApiV1MediaController } from "./api-v1-media.controller";
import { ApiV1StatsController } from "./api-v1-stats.controller";
import { ApiKeyGuard } from "./guards/api-key.guard";
import { ApiThrottlerGuard } from "./guards/api-throttler.guard";

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    LogModule,
    MediaModule,
    StatsModule,
  ],
  controllers: [ApiV1LogController, ApiV1MediaController, ApiV1StatsController],
  providers: [ApiKeyGuard, ApiThrottlerGuard],
})
export class ApiV1Module { }
