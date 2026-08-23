import { CacheModule } from "@nestjs/cache-manager";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ScheduleModule } from "@nestjs/schedule";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AppCacheModule } from "./cache/app-cache.module";
import { ImageCleanupService } from "./jobs/image-cleanup.service";
import { LogModule } from "./log/log.module";
import { MediaModule } from "./media/media.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		CacheModule.register({ isGlobal: true, ttl: 300, max: 500 }),
		EventEmitterModule.forRoot({ wildcard: false, maxListeners: 10 }),
		ScheduleModule.forRoot(),
		AppCacheModule,
		PrismaModule,
		MediaModule,
		LogModule,
	],
	controllers: [AppController],
	providers: [AppService, ImageCleanupService],
})
export class AppModule { }
