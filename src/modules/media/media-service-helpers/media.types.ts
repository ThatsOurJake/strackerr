import { MediaType, TagLinkSource } from "@prisma/client";

export interface CreateMediaData {
  type: MediaType;
  title: string;
  isSkeleton?: boolean;
  createdByUserId: string;
  parentId?: string | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  description?: string | null;
  imageUrl?: string | null;
  imageSourceUrl?: string | null;
  year?: number | null;
  duration?: number | null;
}

export interface CreateIdentifiedMediaData
  extends Omit<CreateMediaData, "createdByUserId"> {
  provider: string;
  externalId: string;
}

export interface ExternalAliasInput {
  providerNamespace: string;
  externalId: string;
}

export interface UserMediaTag {
  id: string;
  label: string;
  normalizedKey: string;
  source: TagLinkSource;
  providerNamespace: string | null;
}

export type UpdateMediaData = Partial<
  Omit<CreateMediaData, "type" | "title">
> & { title?: string };
