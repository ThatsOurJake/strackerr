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
import { MediaType } from "@prisma/client";
import { Response } from "express";
import { AppCacheService } from "../../infrastructure/cache/app-cache.service";
import { AuthenticatedUser } from "../../modules/auth/authenticated-user.interface";
import { CurrentUser } from "../../modules/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../modules/auth/guards/jwt-auth.guard";
import { MetadataService } from "../../modules/metadata/metadata.service";
import { MetadataProviderName } from "../../modules/metadata/metadata-provider.interface";
import { UsersService } from "../../modules/users/users.service";

interface SaveTmdbKeyBody {
	key: string;
}

interface SaveIgdbCredentialsBody {
	clientId: string;
	clientSecret: string;
}

interface SaveProviderPreferencesBody {
	movieProvider?: string;
	tvShowProvider?: string;
	animeProvider?: string;
	gameProvider?: string;
	boardGameProvider?: string;
	musicTrackProvider?: string;
}

const PROVIDER_PREFERENCE_FIELDS = [
	{ field: "movieProvider", mediaType: MediaType.MOVIE, label: "Movies" },
	{ field: "tvShowProvider", mediaType: MediaType.TV_SHOW, label: "TV Shows" },
	{
		field: "animeProvider",
		mediaType: MediaType.TV_SHOW,
		label: "TV Shows (Anime)",
		anime: true,
	},
	{ field: "gameProvider", mediaType: MediaType.GAME, label: "Games" },
	{
		field: "boardGameProvider",
		mediaType: MediaType.BOARD_GAME,
		label: "Board Games",
	},
	{
		field: "musicTrackProvider",
		mediaType: MediaType.MUSIC_TRACK,
		label: "Music Tracks",
	},
] as const;

@Controller("settings")
@UseGuards(JwtAuthGuard)
export class SettingsWebController {
	constructor(
		private readonly usersService: UsersService,
		private readonly cacheService: AppCacheService,
		private readonly metadataService: MetadataService,
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
		const providerPreferences = await this.getProviderPreferences(user.userId);

		res.render("settings", {
			title: "Settings",
			username: userRecord?.username,
			providerKeys,
			configuredProviders: providerKeys.map((k) => k.provider),
			providerPreferences,
		});
	}

	@Post("metadata-providers")
	async saveProviderPreferences(
		@Body() body: SaveProviderPreferencesBody,
		@Res() res: Response,
		@CurrentUser() user: AuthenticatedUser,
	) {
		try {
			for (const preference of PROVIDER_PREFERENCE_FIELDS) {
				const providerName = body[preference.field];
				if (!providerName) {
					throw new Error(`Select a provider for ${preference.label}`);
				}
				this.metadataService.getProvider(
					preference.mediaType,
					providerName as MetadataProviderName,
					"anime" in preference && preference.anime,
				);
				await this.usersService.upsertSetting(
					user.userId,
					this.metadataService.getProviderSettingKey(
						preference.mediaType,
						"anime" in preference && preference.anime,
					),
					providerName,
				);
			}

			const providerKeys = await this.usersService.listProviderKeysForUser(
				user.userId,
			);
			return res.render("settings", {
				title: "Settings",
				providerKeys,
				providerPreferences: await this.getProviderPreferences(user.userId),
				success: "Metadata provider preferences saved",
			});
		} catch (error: unknown) {
			const providerKeys = await this.usersService.listProviderKeysForUser(
				user.userId,
			);
			return res.render("settings", {
				title: "Settings",
				providerKeys,
				providerPreferences: await this.getProviderPreferences(user.userId),
				error:
					error instanceof Error
						? error.message
						: "Failed to save metadata provider preferences",
			});
		}
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

	private async getProviderPreferences(userId: string) {
		return Promise.all(
			PROVIDER_PREFERENCE_FIELDS.map(async (preference) => {
				const savedProvider = await this.usersService.getSetting(
					userId,
					this.metadataService.getProviderSettingKey(
						preference.mediaType,
						"anime" in preference && preference.anime,
					),
				);
				const options = this.metadataService.getProviderOptions(
					preference.mediaType,
					"anime" in preference && preference.anime,
				);
				const selectedProvider = savedProvider ?? options[0]?.name;
				return {
					...preference,
					options: options.map((option) => ({
						...option,
						selected: option.name === selectedProvider,
					})),
				};
			}),
		);
	}
}
