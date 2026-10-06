import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  type HttpException,
  NotFoundException,
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
  MERGE_METADATA_FIELDS,
  type MediaDetail,
  type MergeMetadataField,
} from "../../modules/collection/collection.service";
import {
  toItemEditViewModel,
  toItemMergeViewModel,
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
  addTags?: string;
  removeTagIds?: string | string[];
  removeLogEntryIds?: string | string[];
  aliasRowKey?: string | string[];
  aliasId?: string | string[];
  aliasProviderNamespace?: string | string[];
  aliasExternalId?: string | string[];
  aliasRemove?: string | string[];
}

interface ItemDeleteBody {
  confirmTitle?: string;
}

interface ItemMergeBody {
  targetId?: string;
  confirmTitle?: string;
  [key: string]: string | string[] | undefined;
}

@Controller("items")
@UseGuards(JwtAuthGuard)
export class ItemController {
  constructor(private readonly collectionService: CollectionService) { }

  @Get(":id/merge")
  async merge(
    @Param("id") id: string,
    @Query("query") query: string | undefined,
    @Query("targetId") targetId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const sourceId = await this.resolveLiveItemId(user.userId, id);
    if (sourceId !== id) {
      const parameters = new URLSearchParams();
      if (query) {
        parameters.set("query", query);
      }
      if (targetId) {
        parameters.set("targetId", targetId);
      }
      const suffix = parameters.size > 0 ? `?${parameters.toString()}` : "";
      return response.redirect(`/items/${sourceId}/merge${suffix}`);
    }

    return this.renderMergePage(user.userId, sourceId, response, {
      query,
      targetId,
    });
  }

  @Post(":id/merge")
  async confirmMerge(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ItemMergeBody,
    @Res() response: Response,
  ) {
    const sourceId = await this.resolveLiveItemId(user.userId, id);
    if (sourceId !== id) {
      return response.redirect(`/items/${sourceId}/merge`);
    }

    const targetId = body.targetId?.trim();
    if (!targetId) {
      return this.renderMergePage(
        user.userId,
        sourceId,
        response,
        {
          error: "Select an item to keep before merging.",
        },
        400,
      );
    }

    try {
      const target = await this.collectionService.findDetail(
        user.userId,
        targetId,
      );
      if ((body.confirmTitle ?? "").trim() !== target.title.trim()) {
        throw new BadRequestException(
          "The surviving item title does not match.",
        );
      }

      await this.collectionService.mergeItemsForUser(user.userId, {
        sourceId,
        targetId: target.id,
        sourceFields: this.parseMergeSourceFields(body),
      });
      return response.redirect(
        `/items/${target.id}?success=${encodeURIComponent("Items merged")}`,
      );
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        return this.renderMergePage(
          user.userId,
          sourceId,
          response,
          {
            targetId,
            sourceFields: this.parseMergeSourceFieldsForRender(body),
            error: this.messageFromException(error),
          },
          error.getStatus(),
        );
      }
      throw error;
    }
  }

  @Get(":id")
  async detail(
    @Param("id") id: string,
    @Query("success") success: string | undefined,
    @Query("error") error: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const resolvedId = await this.resolveLiveItemId(user.userId, id);
    if (resolvedId !== id) {
      const parameters = new URLSearchParams();
      if (success) {
        parameters.set("success", success);
      }
      if (error) {
        parameters.set("error", error);
      }
      const suffix = parameters.size > 0 ? `?${parameters.toString()}` : "";
      return response.redirect(`/items/${resolvedId}${suffix}`);
    }

    const item = await this.collectionService.findDetail(
      user.userId,
      resolvedId,
    );
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
    const resolvedId = await this.resolveLiveItemId(user.userId, id);
    if (resolvedId !== id) {
      return response.redirect(`/items/${resolvedId}/edit`);
    }

    const item = await this.collectionService.findDetail(
      user.userId,
      resolvedId,
    );
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
      const result = await this.collectionService.bulkEditItem(
        user.userId,
        id,
        parsed,
      );
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
            removeTagIds: parsed.removeTagIds,
            addTags: parsed.addTags.join(", "),
            aliases: this.toAliasRows(body),
          }),
          title: `Edit ${item.title}`,
          error: this.messageFromException(error),
        });
      }
      throw error;
    }
  }

  @Post(":id/delete")
  async remove(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ItemDeleteBody,
    @Res() response: Response,
  ) {
    const result = await this.collectionService.removeItemForUser(
      user.userId,
      id,
      body.confirmTitle,
    );
    if (!result.removed || !result.itemTitle) {
      return response.redirect("/collection?errorCode=ITEM_REMOVE_FAILED");
    }

    return response.redirect("/collection?successCode=ITEM_REMOVED");
  }

  private parseBody(body: ItemEditBody) {
    const addTags = this.toTagArray(body.addTags);
    const aliases = this.toAliasDrafts(body);
    return {
      title: body.title?.trim() ?? "",
      description: body.description?.trim() ? body.description : null,
      addTags,
      removeTagIds: this.toStringArray(body.removeTagIds),
      removeLogEntryIds: this.toStringArray(body.removeLogEntryIds),
      aliases,
    };
  }

  private async renderMergePage(
    userId: string,
    sourceId: string,
    response: Response,
    options: {
      query?: string;
      targetId?: string;
      sourceFields?: MergeMetadataField[];
      error?: string;
    } = {},
    status?: number,
  ) {
    const source = await this.collectionService.findDetail(userId, sourceId);
    const candidates = await this.collectionService.findMergeCandidates(
      userId,
      source.id,
      options.query ?? "",
    );
    let target: MediaDetail | undefined;
    if (options.targetId) {
      const targetId = await this.resolveLiveItemId(userId, options.targetId);
      target = await this.collectionService.findDetail(userId, targetId);
      if (source.id === target.id || source.type !== target.type) {
        throw new BadRequestException(
          "Choose a different item with the same media type",
        );
      }
    }

    const renderer = status ? response.status(status) : response;
    return renderer.render("items/merge", {
      ...toItemMergeViewModel(source, candidates, {
        query: options.query,
        target,
        sourceFields: options.sourceFields,
        error: options.error,
      }),
      title: `Merge ${source.title}`,
    });
  }

  private async resolveLiveItemId(
    userId: string,
    requestedId: string,
  ): Promise<string> {
    const resolvedId = await this.collectionService.resolveItemId(
      userId,
      requestedId,
    );
    if (!resolvedId) {
      throw new NotFoundException("Media item not found");
    }

    return resolvedId;
  }

  private parseMergeSourceFields(
    body: ItemMergeBody,
  ): MergeMetadataField[] {
    const fields: MergeMetadataField[] = [];
    for (const field of MERGE_METADATA_FIELDS) {
      const selection = body[`fieldSelection_${field}`];
      if (Array.isArray(selection) || !selection) {
        throw new BadRequestException("Invalid merge metadata selection");
      }
      const [origin, selectedField] = selection.split(":", 2);
      if (
        (origin !== "source" && origin !== "target")
        || selectedField !== field
      ) {
        throw new BadRequestException("Invalid merge metadata selection");
      }
      if (origin === "source") {
        fields.push(field);
      }
    }

    return fields;
  }

  private parseMergeSourceFieldsForRender(
    body: ItemMergeBody,
  ): MergeMetadataField[] {
    try {
      return this.parseMergeSourceFields(body);
    } catch {
      return [];
    }
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

  private toTagArray(value: string | undefined): string[] {
    if (!value?.trim()) {
      return [];
    }

    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
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
