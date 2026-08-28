import { Injectable } from "@nestjs/common";
import { MediaType } from "@prisma/client";
import {
  IMetadataProvider,
  MediaItemDetail,
  SearchResult,
} from "./metadata-provider.interface";
import { stripExternalIdPrefix } from "./provider-utils";

interface IgdbCredentials {
  clientId: string;
  clientSecret: string;
}

interface IgdbToken {
  accessToken: string;
  expiresAt: number;
}

interface IgdbGame {
  id: number;
  name: string;
  cover?: { url?: string };
  first_release_date?: number;
  summary?: string;
}

@Injectable()
export class IgdbProvider implements IMetadataProvider {
  readonly name = "igdb" as const;
  private readonly gamesEndpoint = "https://api.igdb.com/v4/games";
  private readonly tokenEndpoint = "https://id.twitch.tv/oauth2/token";
  private readonly tokenCache = new Map<string, IgdbToken>();

  async search(query: string, apiKey?: string): Promise<SearchResult[]> {
    const escapedQuery = query.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
    const games = await this.requestGames(
      `fields id, name, cover.url, first_release_date, summary; search "${escapedQuery}"; limit 10;`,
      apiKey,
    );
    return games.map((game) => this.mapGame(game));
  }

  async getById(externalId: string, apiKey?: string): Promise<MediaItemDetail> {
    const id = stripExternalIdPrefix(externalId);
    const games = await this.requestGames(
      `fields id, name, cover.url, first_release_date, summary; where id = ${id}; limit 1;`,
      apiKey,
    );
    if (!games[0]) {
      throw new Error("IGDB game not found");
    }
    return this.mapGame(games[0]);
  }

  private async requestGames(query: string, apiKey?: string): Promise<IgdbGame[]> {
    const credentials = this.parseCredentials(apiKey);
    const accessToken = await this.getAccessToken(credentials);
    const response = await fetch(this.gamesEndpoint, {
      method: "POST",
      headers: {
        "Client-ID": credentials.clientId,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "text/plain",
      },
      body: query,
    });
    if (response.status === 401) {
      this.tokenCache.delete(credentials.clientId);
      throw new Error(
        "Invalid IGDB credentials. Check your client_id and client_secret in Settings.",
      );
    }
    if (response.status === 429) {
      throw new Error("IGDB rate limit reached. Please try again shortly.");
    }
    if (!response.ok) {
      throw new Error(`IGDB request failed with status ${response.status}`);
    }
    return (await response.json()) as IgdbGame[];
  }

  private parseCredentials(apiKey?: string): IgdbCredentials {
    if (!apiKey) {
      throw new Error(
        "IGDB API key not configured. Add your Twitch credentials in Settings.",
      );
    }
    try {
      const credentials = JSON.parse(apiKey) as Partial<IgdbCredentials>;
      if (!credentials.clientId || !credentials.clientSecret) {
        throw new Error("Missing credentials");
      }
      return {
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
      };
    } catch {
      throw new Error(
        "Invalid IGDB credentials. Check your client_id and client_secret in Settings.",
      );
    }
  }

  private async getAccessToken(credentials: IgdbCredentials): Promise<string> {
    const cachedToken = this.tokenCache.get(credentials.clientId);
    if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
      return cachedToken.accessToken;
    }

    const url = new URL(this.tokenEndpoint);
    url.searchParams.set("client_id", credentials.clientId);
    url.searchParams.set("client_secret", credentials.clientSecret);
    url.searchParams.set("grant_type", "client_credentials");
    const response = await fetch(url, { method: "POST" });
    if (!response.ok) {
      throw new Error(
        "Invalid IGDB credentials. Check your client_id and client_secret in Settings.",
      );
    }
    const token = (await response.json()) as {
      access_token: string;
      expires_in: number;
    };
    this.tokenCache.set(credentials.clientId, {
      accessToken: token.access_token,
      expiresAt: Date.now() + token.expires_in * 1_000,
    });
    return token.access_token;
  }

  private mapGame(game: IgdbGame): MediaItemDetail {
    return {
      externalId: `igdb:${game.id}`,
      title: game.name,
      year: game.first_release_date
        ? new Date(game.first_release_date * 1_000).getUTCFullYear()
        : undefined,
      imageUrl: game.cover?.url
        ? game.cover.url.startsWith("//")
          ? `https:${game.cover.url}`
          : game.cover.url
        : undefined,
      description: game.summary || undefined,
      type: MediaType.GAME,
    };
  }
}
