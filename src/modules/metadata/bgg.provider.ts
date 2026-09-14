import { Injectable } from "@nestjs/common";
import { MediaType } from "@prisma/client";
import { XMLParser } from "fast-xml-parser";
import { decode } from "he";
import {
  IMetadataProvider,
  MediaItemDetail,
  SearchResult,
} from "./metadata-provider.interface";
import { stripExternalIdPrefix, wait } from "./provider-utils";

interface BggValue {
  value?: string | number;
}

interface BggName extends BggValue {
  type?: string;
  sortindex?: string | number;
}

interface BggItem {
  id: string | number;
  name?: BggName | BggName[];
  yearpublished?: BggValue;
  thumbnail?: string;
  image?: string;
  description?: string;
  playingtime?: BggValue;
}

interface BggResponse {
  items?: { item?: BggItem | BggItem[] };
}

@Injectable()
export class BggProvider implements IMetadataProvider {
  readonly name = "bgg" as const;
  private readonly baseUrl = "https://boardgamegeek.com/xmlapi2";
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
  });

  async search(query: string, apiKey?: string): Promise<SearchResult[]> {
    const url = new URL(`${this.baseUrl}/search`);
    url.searchParams.set("query", query);
    url.searchParams.set("type", "boardgame");
    const response = await this.fetchXml(url, apiKey);
    const items = this.asArray(response.items?.item as BggItem | BggItem[]).slice(0, 10);
    const imageLookup = await this.fetchThingImages(items, apiKey);
    return items.map((item) => this.mapItem(item, imageLookup.get(String(item.id))));
  }

  async getById(externalId: string, apiKey?: string): Promise<MediaItemDetail> {
    const url = new URL(`${this.baseUrl}/thing`);
    url.searchParams.set("id", stripExternalIdPrefix(externalId));
    url.searchParams.set("stats", "1");
    const response = await this.fetchXml(url, apiKey, true);
    const item = this.asArray(response.items?.item as BggItem | BggItem[])[0];
    if (!item) {
      throw new Error("BGG board game not found");
    }
    return this.mapItem(item);
  }

  private async fetchXml(
    url: URL,
    apiKey?: string,
    retryQueued = false,
  ): Promise<BggResponse> {
    if (!apiKey) {
      throw new Error("BoardGameGeek API key not configured. Add it in Settings.");
    }

    const requestOptions = {
      headers: { Authorization: `Bearer ${apiKey}` },
    };
    let response = await fetch(url, requestOptions);
    if (response.status === 202 && retryQueued) {
      await wait(1_000);
      response = await fetch(url, requestOptions);
      if (response.status === 202) {
        throw new Error("BGG is processing the request, please try again.");
      }
    }
    if (response.status === 401) {
      throw new Error(
        "BoardGameGeek API key was rejected. Replace it in Settings.",
      );
    }
    if (!response.ok) {
      throw new Error(`BGG request failed with status ${response.status}`);
    }
    return this.parser.parse(await response.text()) as BggResponse;
  }

  private async fetchThingImages(
    items: BggItem[],
    apiKey?: string,
  ): Promise<Map<string, string>> {
    const ids = items
      .map((item) => String(item.id).trim())
      .filter((id) => id.length > 0);
    if (ids.length === 0) {
      return new Map();
    }

    const url = new URL(`${this.baseUrl}/thing`);
    url.searchParams.set("id", ids.join(","));
    const response = await this.fetchXml(url, apiKey);
    const detailItems = this.asArray(response.items?.item as BggItem | BggItem[]);
    const imageLookup = new Map<string, string>();
    for (const detailItem of detailItems) {
      const imageUrl = detailItem.image || detailItem.thumbnail || undefined;
      if (!imageUrl) {
        continue;
      }
      imageLookup.set(String(detailItem.id), imageUrl);
    }
    return imageLookup;
  }

  private mapItem(item: BggItem, fallbackImageUrl?: string): MediaItemDetail {
    const names = this.asArray(item.name);
    const primaryName =
      names.find((name) => String(name.sortindex) === "1") ?? names[0];
    return {
      externalId: `bgg:${item.id}`,
      title: String(primaryName?.value ?? "Untitled"),
      year: this.numberValue(item.yearpublished),
      imageUrl: item.image || item.thumbnail || fallbackImageUrl,
      description: item.description ? decode(item.description) : undefined,
      duration: this.numberValue(item.playingtime),
      type: MediaType.BOARD_GAME,
    };
  }

  private numberValue(value?: BggValue): number | undefined {
    if (value?.value === undefined) {
      return undefined;
    }
    const parsed = Number(value.value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private asArray<T>(value?: T | T[]): T[] {
    if (value === undefined) {
      return [];
    }
    return Array.isArray(value) ? value : [value];
  }
}
