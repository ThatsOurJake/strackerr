import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  type HttpException,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import type { AuthenticatedUser } from "../../modules/auth/authenticated-user.interface";
import { CurrentUser } from "../../modules/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../modules/auth/guards/jwt-auth.guard";
import {
  CollectionService,
  type ExternalAliasDraft,
} from "../../modules/collection/collection.service";
import {
  toItemEditViewModel,
  toMediaDetailViewModel,
} from "../collection-view-model";

const DETAIL_VIEWS = {
  MOVIE: "collection/movie",
  TV_SHOW: "collection/tv-show",
  GAME: "collection/game",
  BOARD_GAME: "collection/board-game",
  MUSIC_TRACK: "collection/music-track",
} as const;

interface ItemEditBody {
  title?: string;
  description?: string;
  removeLogEntryIds?: string | string[];
  aliasRowKey?: string | string[];
  aliasId?: string | string[];
  aliasProviderNamespace?: string | string[];
  aliasExternalId?: string | string[];
  aliasRemove?: string | string[];
}

@Controller("items")
@UseGuards(JwtAuthGuard)
export class ItemController {
  constructor(private readonly collectionService: CollectionService) { }

  @Get(":id")
  async detail(
    @Param("id") id: string,
    @Query("success") success: string | undefined,
    @Query("error") error: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const item = await this.collectionService.findDetail(user.userId, id);
    const view = DETAIL_VIEWS[item.type as keyof typeof DETAIL_VIEWS];
    if (!view) {
      return response.status(404).send("Media item not found");
    }

    return response.render(view, {
      ...toMediaDetailViewModel(item),
      success,
      error,
    });
  }

  @Get(":id/edit")
  async edit(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const item = await this.collectionService.findDetail(user.userId, id);
    return response.render("items/edit", {
      ...toItemEditViewModel(item),
      title: `Edit ${item.title}`,
    });
  }

  @Post(":id/edit")
  async save(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ItemEditBody,
    @Res() response: Response,
  ) {
    const parsed = this.parseBody(body);
    try {
      const result = await this.collectionService.bulkEditItem(user.userId, id, parsed);
      if (!result.stillAccessible) {
        return response.redirect(
          `/collection?success=${encodeURIComponent("Item changes saved")}`,
        );
      }
      return response.redirect(
        `/items/${result.itemId}?success=${encodeURIComponent("Item changes saved")}`,
      );
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof ForbiddenException
      ) {
        const item = await this.collectionService.findDetail(user.userId, id);
        return response.status(error.getStatus()).render("items/edit", {
          ...toItemEditViewModel(item, {
            title: parsed.title,
            description: parsed.description ?? "",
            removeLogEntryIds: parsed.removeLogEntryIds,
            aliases: this.toAliasRows(body),
          }),
          title: `Edit ${item.title}`,
          error: this.messageFromException(error),
        });
      }
      throw error;
    }
  }

  private parseBody(body: ItemEditBody) {
    const aliases = this.toAliasDrafts(body);
    return {
      title: body.title?.trim() ?? "",
      description: body.description?.trim() ? body.description : null,
      removeLogEntryIds: this.toStringArray(body.removeLogEntryIds),
      aliases,
    };
  }

  private toAliasRows(body: ItemEditBody) {
    const rowKeys = this.toStringArray(body.aliasRowKey);
    const ids = this.toStringArray(body.aliasId);
    const providers = this.toStringArray(body.aliasProviderNamespace);
    const externalIds = this.toStringArray(body.aliasExternalId);
    const removalSet = new Set(this.toStringArray(body.aliasRemove));

    return rowKeys.map((rowKey, index) => ({
      rowKey,
      id: ids[index] || undefined,
      providerNamespace: providers[index] ?? "",
      externalId: externalIds[index] ?? "",
      remove: removalSet.has(rowKey),
    }));
  }

  private toAliasDrafts(body: ItemEditBody): ExternalAliasDraft[] {
    return this.toAliasRows(body).map((alias) => ({
      id: alias.id,
      providerNamespace: alias.providerNamespace,
      externalId: alias.externalId,
      remove: alias.remove,
    }));
  }

  private toStringArray(value: string | string[] | undefined): string[] {
    if (!value) {
      return [];
    }
    return Array.isArray(value) ? value : [value];
  }

  private messageFromException(error: HttpException): string {
    const response = error.getResponse();
    if (typeof response === "string") {
      return response;
    }
    if (typeof response === "object" && response && "message" in response) {
      const message = response.message;
      return Array.isArray(message) ? message.join(", ") : String(message);
    }
    return "Unable to save item changes";
  }
}
