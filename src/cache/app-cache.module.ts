import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Global, Module } from "@nestjs/common";
import type { Cache } from "cache-manager";
import { AppCacheService } from "./app-cache.service";

@Global()
@Module({
  providers: [
    {
      provide: AppCacheService,
      inject: [CACHE_MANAGER],
      useFactory: (cacheManager: Cache) => new AppCacheService(cacheManager),
    },
  ],
  exports: [AppCacheService],
})

export class AppCacheModule { }
