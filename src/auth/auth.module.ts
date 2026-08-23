import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AppCacheModule } from "../cache/app-cache.module";
import { PrismaModule } from "../prisma/prisma.module";
import { UsersModule } from "../users/users.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AdminWebController } from "./controllers/admin-web.controller";
import { AuthWebController } from "./controllers/auth-web.controller";
import { SettingsWebController } from "./controllers/settings-web.controller";
import { AdminGuard } from "./guards/admin.guard";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { LocalStrategy } from "./strategies/local.strategy";

@Module({
	imports: [
		PassportModule,
		UsersModule,
		PrismaModule,
		AppCacheModule,
		JwtModule.registerAsync({
			inject: [ConfigService],
			useFactory: (config: ConfigService) => ({
				secret: config.get("JWT_SECRET"),
				signOptions: { expiresIn: "7d" },
			}),
		}),
	],
	controllers: [
		AuthController,
		AuthWebController,
		AdminWebController,
		SettingsWebController,
	],
	providers: [
		AuthService,
		LocalStrategy,
		JwtStrategy,
		JwtAuthGuard,
		AdminGuard,
	],
	exports: [AuthService, JwtAuthGuard, AdminGuard, JwtModule],
})
export class AuthModule { }
