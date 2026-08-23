import { Module } from "@nestjs/common";
import { PrismaModule } from "../../infrastructure/database/prisma.module";
import { SearchService } from "./search.service";

@Module({
  imports: [PrismaModule],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule { }
