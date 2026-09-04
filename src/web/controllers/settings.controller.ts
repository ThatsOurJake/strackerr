import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Response } from "express";
import { AppCacheService } from "../../infrastructure/cache/app-cache.service";
import { ImageCleanupService } from "../../infrastructure/jobs/image-cleanup.service";
import { AuthenticatedUser } from "../../modules/auth/authenticated-user.interface";
import { CurrentUser } from "../../modules/auth/decorators/current-user.decorator";
import { AdminGuard } from "../../modules/auth/guards/admin.guard";
import { JwtAuthGuard } from "../../modules/auth/guards/jwt-auth.guard";
import { MetadataService } from "../../modules/metadata/metadata.service";
import { MetadataProviderName } from "../../modules/metadata/metadata-provider.interface";
import { UsersService } from "../../modules/users/users.service";
import {
  buildPasswordErrors,
  type ChangePasswordBody,
  getProviderPreferences,
  normalizeSettingsTab,
  PROVIDER_CREDENTIALS,
  PROVIDER_PREFERENCE_FIELDS,
  type RemoveProviderBody,
  type SaveBggKeyBody,
  type SaveIgdbCredentialsBody,
  type SaveProviderPreferencesBody,
  type SaveTmdbKeyBody,
  type SettingsFeedback,
  type SettingsTab,
  validateProviderName,
} from "./settings.controller.helpers";

@Controller("settings")
@UseGuards(JwtAuthGuard, AdminGuard)
export class SettingsWebController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cacheService: AppCacheService,
    private readonly metadataService: MetadataService,
    private readonly imageCleanupService: ImageCleanupService,
  ) { }

  @Get()
  async getSettings(
    @Query("tab") tab: string | undefined,
    @Res() res: Response,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.renderSettings(res, user, normalizeSettingsTab(tab));
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

      return this.renderSettings(res, user, "providers", {
        success: "Metadata provider preferences saved",
      });
    } catch (error: unknown) {
      return this.renderSettings(res, user, "providers", {
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
    if (!body.key?.trim()) {
      return this.renderSettings(res, user, "providers", {
        error: "TMDB API key is required",
      });
    }

    return this.saveProviderCredential(
      res,
      user,
      "tmdb",
      body.key.trim(),
      "TMDB API key saved",
    );
  }

  @Post("provider-key/igdb")
  async saveIgdbCredentials(
    @Body() body: SaveIgdbCredentialsBody,
    @Res() res: Response,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!body.clientId?.trim() || !body.clientSecret?.trim()) {
      return this.renderSettings(res, user, "providers", {
        error: "IGDB client ID and client secret are required",
      });
    }

    return this.saveProviderCredential(
      res,
      user,
      "igdb",
      JSON.stringify({
        clientId: body.clientId.trim(),
        clientSecret: body.clientSecret.trim(),
      }),
      "IGDB credentials saved",
    );
  }

  @Post("provider-key/bgg")
  async saveBggKey(
    @Body() body: SaveBggKeyBody,
    @Res() res: Response,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!body.key?.trim()) {
      return this.renderSettings(res, user, "providers", {
        error: "BoardGameGeek API key is required",
      });
    }

    return this.saveProviderCredential(
      res,
      user,
      "bgg",
      body.key.trim(),
      "BoardGameGeek API key saved",
    );
  }

  @Post("provider-key/:provider/remove")
  async deleteProviderKey(
    @Param("provider") provider: string,
    @Body() body: RemoveProviderBody,
    @Res() res: Response,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!validateProviderName(provider)) {
      return this.renderSettings(res, user, "providers", {
        error: "Unknown metadata provider",
      });
    }
    if (body.confirmRemoval !== "yes") {
      return this.renderSettings(res, user, "providers", {
        error: "Confirm credential removal before continuing",
      });
    }

    try {
      await this.usersService.deleteMetadataKey(user.userId, provider);
      return this.renderSettings(res, user, "providers", {
        success: `${provider.toUpperCase()} credentials removed`,
      });
    } catch {
      return this.renderSettings(res, user, "providers", {
        error: "Failed to remove provider credentials",
      });
    }
  }

  @Post("password")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async changePassword(
    @Body() body: ChangePasswordBody,
    @Res() res: Response,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const passwordErrors = buildPasswordErrors(body);

    if (Object.keys(passwordErrors).length > 0) {
      return this.renderSettings(res, user, "account", { passwordErrors });
    }

    const currentPasswordValid = await this.usersService.verifyPassword(
      user.userId,
      body.currentPassword,
    );
    if (!currentPasswordValid) {
      return this.renderSettings(res, user, "account", {
        passwordErrors: {
          currentPassword: "Current password is incorrect",
        },
      });
    }

    await this.usersService.changePassword(user.userId, body.newPassword);
    return this.renderSettings(res, user, "account", {
      success: "Password changed successfully",
    });
  }

  @Post("api-key/regenerate")
  async regenerateApiKey(
    @Res() res: Response,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    try {
      const newApiKey = await this.usersService.regenerateApiKey(user.userId);
      return this.renderSettings(res, user, "account", {
        newApiKey,
        success:
          "API key regenerated. Save it now; it will not be shown again.",
      });
    } catch {
      return this.renderSettings(res, user, "account", {
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
      return this.renderSettings(res, user, "maintenance", {
        success: "All caches cleared",
      });
    } catch {
      return this.renderSettings(res, user, "maintenance", {
        error: "Failed to clear caches",
      });
    }
  }

  @Post("images/cleanup")
  async cleanupImages(
    @Res() res: Response,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const started = this.imageCleanupService.startCleanup();
    return this.renderSettings(
      res,
      user,
      "maintenance",
      started
        ? { success: "Unused image cleanup started" }
        : { error: "Unused image cleanup is already running" },
    );
  }

  private async saveProviderCredential(
    res: Response,
    user: AuthenticatedUser,
    provider: string,
    plainCredential: string,
    success: string,
  ) {
    try {
      await this.usersService.upsertMetadataKey(
        user.userId,
        provider,
        plainCredential,
      );
      return this.renderSettings(res, user, "providers", { success });
    } catch (error: unknown) {
      return this.renderSettings(res, user, "providers", {
        error:
          error instanceof Error
            ? error.message
            : `Failed to save ${provider.toUpperCase()} credentials`,
      });
    }
  }

  private async renderSettings(
    res: Response,
    user: AuthenticatedUser,
    activeTab: SettingsTab,
    feedback: SettingsFeedback = {},
  ) {
    const [providerKeys, userRecord, providerPreferences] = await Promise.all([
      this.usersService.listProviderKeysForUser(user.userId),
      this.usersService.findById(user.userId),
      getProviderPreferences(
        this.usersService,
        this.metadataService,
        user.userId,
      ),
    ]);
    const configuredProviders = new Set(
      providerKeys.map((key) => key.provider),
    );

    return res.render("settings", {
      title: "Settings",
      username: userRecord?.username,
      activeTab,
      providerCredentials: PROVIDER_CREDENTIALS.map((provider) => ({
        ...provider,
        configured: configuredProviders.has(provider.provider),
      })),
      providerPreferences,
      imageCleanup: this.imageCleanupService.getStatus(),
      ...feedback,
    });
  }
}
