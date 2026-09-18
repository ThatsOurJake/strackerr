import { Module } from "@nestjs/common";
import { ActivityModule } from "../activity/activity.module";
import { StatsService } from "./stats.service";

@Module({
  imports: [ActivityModule],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule { }