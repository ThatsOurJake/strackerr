import { Module } from "@nestjs/common";
import { CollectionService } from "./collection.service";

@Module({
  providers: [CollectionService],
  exports: [CollectionService],
})
export class CollectionModule { }
