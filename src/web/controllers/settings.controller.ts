import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Post,
	Res,
	UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { AppCacheService } from "../../infrastructure/cache/app-cache.service";
import { AuthenticatedUser } from "../../modules/auth/authenticated-user.interface";
import { CurrentUser } from "../../modules/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../modules/auth/guards/jwt-auth.guard";
import { UsersService } from "../../modules/users/users.service";

interface SaveTmdbKeyBody {
	key: string;
}

interface SaveIgdbCredentialsBody {
	clientId: string;
	clientSecret: string;
}

@Controller("settings")
@UseGuards(JwtAuthGuard)
export class SettingsWebController {
	constructor(
		private readonly usersService: UsersService,
		private readonly cacheService: AppCacheService,
	) { }

	@Get()
	async getSettings(
		@Res() res: Response,
		@CurrentUser() user: AuthenticatedUser,
	) {
		const providerKeys = await this.usersService.listProviderKeysForUser(
			user.userId,
		);
		const userRecord = await this.usersService.findById(user.userId);

		res.render("settings", {
			title: "Settings",
			username: userRecord?.username,
			providerKeys,
			configuredProviders: providerKeys.map((k) => k.provider),
		});
	}

	@Post("provider-key/tmdb")
	async saveTmdbKey(
		@Body() body: SaveTmdbKeyBody,
		@Res() res: Response,
		@CurrentUser() user: AuthenticatedUser,
	) {
		try {
			if (!body.key?.trim()) {
				const providerKeys = await this.usersService.listProviderKeysForUser(
					user.userId,
				);
				return res.render("settings", {
					title: "Settings",
					providerKeys,
					error: "TMDB API key is required",
				});
			}

			await this.usersService.upsertMetadataKey(
				user.userId,
				"tmdb",
				body.key.trim(),
			);
			const providerKeys = await this.usersService.listProviderKeysForUser(
				user.userId,
			);

			return res.render("settings", {
				title: "Settings",
				providerKeys,
				success: "TMDB API key saved",
			});
		} catch (error: unknown) {
			const providerKeys = await this.usersService.listProviderKeysForUser(
				user.userId,
			);
			return res.render("settings", {
				title: "Settings",
				providerKeys,
				error:
					error instanceof Error
						? error.message
						: "Failed to save TMDB API key",
			});
		}
	}

	@Post("provider-key/igdb")
	async saveIgdbCredentials(
		@Body() body: SaveIgdbCredentialsBody,
		@Res() res: Response,
		@CurrentUser() user: AuthenticatedUser,
	) {
		try {
			if (!body.clientId?.trim() || !body.clientSecret?.trim()) {
				const providerKeys = await this.usersService.listProviderKeysForUser(
					user.userId,
				);
				return res.render("settings", {
					title: "Settings",
					providerKeys,
					error: "IGDB client ID and client secret are required",
				});
			}

			await this.usersService.upsertMetadataKey(
				user.userId,
				"igdb",
				JSON.stringify({
					clientId: body.clientId.trim(),
					clientSecret: body.clientSecret.trim(),
				}),
			);
			const providerKeys = await this.usersService.listProviderKeysForUser(
				user.userId,
			);

			return res.render("settings", {
				title: "Settings",
				providerKeys,
				success: "IGDB credentials saved",
			});
		} catch (error: unknown) {
			const providerKeys = await this.usersService.listProviderKeysForUser(
				user.userId,
			);
			return res.render("settings", {
				title: "Settings",
				providerKeys,
				error:
					error instanceof Error
						? error.message
						: "Failed to save IGDB credentials",
			});
		}
	}

	@Delete("provider-key/:provider")
	async deleteProviderKey(
		@Param("provider") provider: string,
		@Res() res: Response,
		@CurrentUser() user: AuthenticatedUser,
	) {
		try {
			await this.usersService.deleteMetadataKey(user.userId, provider);
			const providerKeys = await this.usersService.listProviderKeysForUser(
				user.userId,
			);

			return res.render("settings", {
				title: "Settings",
				providerKeys,
				success: `${provider} API key removed`,
			});
		} catch {
			const providerKeys = await this.usersService.listProviderKeysForUser(
				user.userId,
			);
			return res.render("settings", {
				title: "Settings",
				providerKeys,
				error: "Failed to delete provider key",
			});
		}
	}

	@Post("api-key/regenerate")
	async regenerateApiKey(
		@Res() res: Response,
		@CurrentUser() user: AuthenticatedUser,
	) {
		try {
			const newApiKey = await this.usersService.regenerateApiKey(user.userId);
			const providerKeys = await this.usersService.listProviderKeysForUser(
				user.userId,
			);

			return res.render("settings", {
				title: "Settings",
				providerKeys,
				newApiKey,
				success: "API key regenerated. Save it now — you won't see it again!",
			});
		} catch {
			const providerKeys = await this.usersService.listProviderKeysForUser(
				user.userId,
			);
			return res.render("settings", {
				title: "Settings",
				providerKeys,
				error: "Failed to regenerate API key",
			});
		}
	}

	@Post("cache/clear")
	async clearCache(
		@Res() res: Response,
		@CurrentUser() user: AuthenticatedUser,
	) {
		try {
			await this.cacheService.clearForUser(user.userId);

			const providerKeys = await this.usersService.listProviderKeysForUser(
				user.userId,
			);
			return res.render("settings", {
				title: "Settings",
				providerKeys,
				success: "All caches cleared",
			});
		} catch {
			const providerKeys = await this.usersService.listProviderKeysForUser(
				user.userId,
			);
			return res.render("settings", {
				title: "Settings",
				providerKeys,
				error: "Failed to clear caches",
			});
		}
	}
}
