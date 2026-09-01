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
    const items = this.asArray(response.items?.item as BggItem | BggItem[]);
    return items.slice(0, 10).map((item) => this.mapItem(item));
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

  private mapItem(item: BggItem): MediaItemDetail {
    const names = this.asArray(item.name);
    const primaryName =
      names.find((name) => String(name.sortindex) === "1") ?? names[0];
    return {
      externalId: `bgg:${item.id}`,
      title: String(primaryName?.value ?? "Untitled"),
      year: this.numberValue(item.yearpublished),
      imageUrl: item.image || undefined,
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
