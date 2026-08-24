import { Module } from "@nestjs/common";
import { LogModule } from "../activity/log.module";
import { StatsService } from "./stats.service";

@Module({
  imports: [LogModule],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule { }