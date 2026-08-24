import { CacheModule } from "@nestjs/cache-manager";
import { MiddlewareConsumer, Module, RequestMethod } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ScheduleModule } from "@nestjs/schedule";
import { AppCacheModule } from "./infrastructure/cache/app-cache.module";
import { PrismaModule } from "./infrastructure/database/prisma.module";
import { ImageCleanupService } from "./infrastructure/jobs/image-cleanup.service";
import { LogModule } from "./infrastructure/logging/log.module";
import { LogModule as ActivityLogModule } from "./modules/activity/log.module";
import { AuthModule } from "./modules/auth/auth.module";
import { JwtCookieMiddleware } from "./modules/auth/middleware/jwt-cookie.middleware";
import { MediaModule } from "./modules/media/media.module";
import { SearchModule } from "./modules/search/search.module";
import { UsersModule } from "./modules/users/users.module";
import { WebModule } from "./web/web.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.register({ isGlobal: true, ttl: 300, max: 500 }),
    EventEmitterModule.forRoot({ wildcard: false, maxListeners: 10 }),
    ScheduleModule.forRoot(),
    AppCacheModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    MediaModule,
    ActivityLogModule,
    LogModule,
    SearchModule,
    WebModule,
  ],
  providers: [ImageCleanupService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(JwtCookieMiddleware)
      .forRoutes({ path: "*", method: RequestMethod.ALL });
  }
}
