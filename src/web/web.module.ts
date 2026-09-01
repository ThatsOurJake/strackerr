import { Module } from "@nestjs/common";
import { AppService } from "../app.service";
import { ImageCleanupService } from "../infrastructure/jobs/image-cleanup.service";
import { LogModule } from "../modules/activity/log.module";
import { AuthModule } from "../modules/auth/auth.module";
import { CollectionModule } from "../modules/collection/collection.module";
import { MediaModule } from "../modules/media/media.module";
import { MetadataModule } from "../modules/metadata/metadata.module";
import { SearchModule } from "../modules/search/search.module";
import { StatsModule } from "../modules/stats/stats.module";
import { UsersModule } from "../modules/users/users.module";
import { AddController } from "./controllers/add.controller";
import { AdminWebController } from "./controllers/admin-users.controller";
import { AuthController } from "./controllers/auth.controller";
import { AuthWebController } from "./controllers/auth-web.controller";
import { CollectionController } from "./controllers/collection.controller";
import { DashboardController } from "./controllers/dashboard.controller";
import { HistoryController } from "./controllers/history.controller";
import { IdentifyController } from "./controllers/identify.controller";
import { SearchController } from "./controllers/search.controller";
import { SettingsWebController } from "./controllers/settings.controller";
import { StatsController } from "./controllers/stats.controller";

@Module({
  imports: [
    AuthModule,
    UsersModule,
    MetadataModule,
    SearchModule,
    LogModule,
    StatsModule,
    CollectionModule,
    MediaModule,
  ],
  controllers: [
    DashboardController,
    AuthWebController,
    AuthController,
    AdminWebController,
    SettingsWebController,
    SearchController,
    HistoryController,
    StatsController,
    CollectionController,
    AddController,
    IdentifyController,
  ],
  providers: [AppService, ImageCleanupService],
})
export class WebModule { }
