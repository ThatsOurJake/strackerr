import { Module } from "@nestjs/common";
import { AppService } from "../app.service";
import { LogModule } from "../modules/activity/log.module";
import { AuthModule } from "../modules/auth/auth.module";
import { SearchModule } from "../modules/search/search.module";
import { StatsModule } from "../modules/stats/stats.module";
import { UsersModule } from "../modules/users/users.module";
import { AdminWebController } from "./controllers/admin-users.controller";
import { AuthController } from "./controllers/auth.controller";
import { AuthWebController } from "./controllers/auth-web.controller";
import { DashboardController } from "./controllers/dashboard.controller";
import { HistoryController } from "./controllers/history.controller";
import { SearchController } from "./controllers/search.controller";
import { SettingsWebController } from "./controllers/settings.controller";
import { StatsController } from "./controllers/stats.controller";

@Module({
  imports: [AuthModule, UsersModule, SearchModule, LogModule, StatsModule],
  controllers: [
    DashboardController,
    AuthWebController,
    AuthController,
    AdminWebController,
    SettingsWebController,
    SearchController,
    HistoryController,
    StatsController,
  ],
  providers: [AppService],
})
export class WebModule { }
