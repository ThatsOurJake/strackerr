import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { UsersModule } from "../users/users.module";
import { AuthService } from "./auth.service";
import { AdminGuard } from "./guards/admin.guard";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { LocalStrategy } from "./strategies/local.strategy";

@Module({
	imports: [
		PassportModule,
		UsersModule,
		JwtModule.registerAsync({
			inject: [ConfigService],
			useFactory: (config: ConfigService) => ({
				secret: config.get("JWT_SECRET"),
				signOptions: { expiresIn: "7d" },
			}),
		}),
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
