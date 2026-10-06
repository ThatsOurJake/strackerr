import { ConflictException } from "@nestjs/common";
import { TagLinkSource } from "@prisma/client";
import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { stripHtmlTags } from "../../../infrastructure/security/sanitize-string";
import type { UserMediaTag } from "./media.types";
import { normalizeTagInputs } from "./media.utils";

export class MediaTagsOperations {
  constructor(private readonly prisma: PrismaService) { }

  async listTagsForItem(mediaItemId: string, userId: string): Promise<UserMediaTag[]> {
    const links = await this.prisma.mediaItemTag.findMany({
      where: {
        mediaItemId,
        userId,
      },
      include: {
        tag: true,
      },
      orderBy: [
        { source: "asc" },
        { providerNamespace: "asc" },
        { tag: { displayName: "asc" } },
      ],
    });

    return links.map((link) => ({
      id: link.tagId,
      label: link.tag.displayName,
      normalizedKey: link.tag.normalizedKey,
      source: link.source,
      providerNamespace: link.providerNamespace || null,
    }));
  }

  async replaceProviderTagsForItem(
    mediaItemId: string,
    userId: string,
    providerNamespace: string,
    tags: string[],
  ): Promise<void> {
    const normalizedTags = normalizeTagInputs(tags, stripHtmlTags);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.mediaItemTag.deleteMany({
        where: {
          mediaItemId,
          userId,
          source: TagLinkSource.PROVIDER,
          providerNamespace,
        },
      });

      if (normalizedTags.length === 0) {
        return;
      }

      const existingTags = await transaction.tag.findMany({
        where: {
          userId,
          normalizedKey: {
            in: normalizedTags.map((tag) => tag.normalizedKey),
          },
        },
      });
      const existingByKey = new Map(
        existingTags.map((tag) => [tag.normalizedKey, tag]),
      );

      for (const normalizedTag of normalizedTags) {
        if (existingByKey.has(normalizedTag.normalizedKey)) {
          continue;
        }

        const created = await transaction.tag.create({
          data: {
            userId,
            normalizedKey: normalizedTag.normalizedKey,
            displayName: normalizedTag.label,
          },
        });
        existingByKey.set(normalizedTag.normalizedKey, created);
      }

      await transaction.mediaItemTag.createMany({
        data: normalizedTags.map((tag) => {
          const resolved = existingByKey.get(tag.normalizedKey);
          if (!resolved) {
            throw new Error("Tag resolution failed");
          }

          return {
            userId,
            mediaItemId,
            tagId: resolved.id,
            source: TagLinkSource.PROVIDER,
            providerNamespace,
          };
        }),
      });
    });
  }

  async syncManualTagsForItem(
    mediaItemId: string,
    userId: string,
    tagsToAdd: string[],
    tagIdsToRemove: string[],
  ): Promise<void> {
    const normalizedTagsToAdd = normalizeTagInputs(tagsToAdd, stripHtmlTags);
    const removeIds = [...new Set(tagIdsToRemove)];

    await this.prisma.$transaction(async (transaction) => {
      const existingManualLinks = await transaction.mediaItemTag.findMany({
        where: {
          mediaItemId,
          userId,
          source: TagLinkSource.MANUAL,
        },
        include: {
          tag: true,
        },
      });

      if (removeIds.length > 0) {
        const removableTagIds = new Set(
          existingManualLinks.map((link) => link.tagId),
        );
        const unauthorizedRemovals = removeIds.filter(
          (tagId) => !removableTagIds.has(tagId),
        );
        if (unauthorizedRemovals.length > 0) {
          throw new ConflictException("One or more selected tags cannot be removed");
        }

        await transaction.mediaItemTag.deleteMany({
          where: {
            mediaItemId,
            userId,
            source: TagLinkSource.MANUAL,
            tagId: { in: removeIds },
          },
        });
      }

      if (normalizedTagsToAdd.length === 0) {
        return;
      }

      const currentManualKeys = new Set(
        existingManualLinks
          .filter((link) => !removeIds.includes(link.tagId))
          .map((link) => link.tag.normalizedKey),
      );
      const dedupedNewTags = normalizedTagsToAdd.filter(
        (tag) => !currentManualKeys.has(tag.normalizedKey),
      );

      if (dedupedNewTags.length === 0) {
        return;
      }

      const existingTags = await transaction.tag.findMany({
        where: {
          userId,
          normalizedKey: {
            in: dedupedNewTags.map((tag) => tag.normalizedKey),
          },
        },
      });
      const existingByKey = new Map(
        existingTags.map((tag) => [tag.normalizedKey, tag]),
      );

      for (const newTag of dedupedNewTags) {
        if (existingByKey.has(newTag.normalizedKey)) {
          continue;
        }

        const created = await transaction.tag.create({
          data: {
            userId,
            normalizedKey: newTag.normalizedKey,
            displayName: newTag.label,
          },
        });
        existingByKey.set(newTag.normalizedKey, created);
      }

      await transaction.mediaItemTag.createMany({
        data: dedupedNewTags.map((tag) => {
          const resolved = existingByKey.get(tag.normalizedKey);
          if (!resolved) {
            throw new Error("Tag resolution failed");
          }

          return {
            userId,
            mediaItemId,
            tagId: resolved.id,
            source: TagLinkSource.MANUAL,
            providerNamespace: "",
          };
        }),
      });
    });
  }
}
