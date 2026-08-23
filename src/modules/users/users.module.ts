import { Module } from "@nestjs/common";
import { PrismaModule } from "../../infrastructure/database/prisma.module";
import { EncryptionService } from "./encryption.service";
import { UsersService } from "./users.service";

@Module({
  imports: [PrismaModule],
  providers: [UsersService, EncryptionService],
  exports: [UsersService, EncryptionService],
})
export class UsersModule { }
