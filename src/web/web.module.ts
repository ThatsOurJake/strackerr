import { Module } from "@nestjs/common";
import { AppService } from "../app.service";
import { AuthModule } from "../modules/auth/auth.module";
import { SearchModule } from "../modules/search/search.module";
import { UsersModule } from "../modules/users/users.module";
import { AdminWebController } from "./controllers/admin-users.controller";
import { AuthController } from "./controllers/auth.controller";
import { AuthWebController } from "./controllers/auth-web.controller";
import { AppController } from "./controllers/home.controller";
import { SearchController } from "./controllers/search.controller";
import { SettingsWebController } from "./controllers/settings.controller";

@Module({
  imports: [AuthModule, UsersModule, SearchModule],
  controllers: [
    AppController,
    AuthWebController,
    AuthController,
    AdminWebController,
    SettingsWebController,
    SearchController,
  ],
  providers: [AppService],
})
export class WebModule { }
