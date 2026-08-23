import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { UsersService } from "./users.service";
import { EncryptionService } from "./encryption.service";

@Module({
  imports: [PrismaModule],
  providers: [UsersService, EncryptionService],
  exports: [UsersService, EncryptionService],
})
export class UsersModule {}
