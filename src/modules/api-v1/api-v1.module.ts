import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { ActivityModule } from "../activity/activity.module";
import { MediaModule } from "../media/media.module";
import { StatsModule } from "../stats/stats.module";
import { UsersModule } from "../users/users.module";
import { ApiV1ActivityController } from "./api-v1-activity.controller";
import { ApiV1MediaController } from "./api-v1-media.controller";
import { ApiV1ProfileController } from "./api-v1-profile.controller";
import { ApiV1StatsController } from "./api-v1-stats.controller";
import { ApiKeyGuard } from "./guards/api-key.guard";
import { ApiKeyNotFoundGuard } from "./guards/api-key-not-found.guard";
import { ApiThrottlerGuard } from "./guards/api-throttler.guard";

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    ActivityModule,
    MediaModule,
    StatsModule,
    UsersModule,
  ],
  controllers: [
    ApiV1ActivityController,
    ApiV1MediaController,
    ApiV1ProfileController,
    ApiV1StatsController,
  ],
  providers: [ApiKeyGuard, ApiKeyNotFoundGuard, ApiThrottlerGuard],
})
export class ApiV1Module { }
