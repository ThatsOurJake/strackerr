import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import type { Cache } from "cache-manager";
import { Events } from "../events/event-names";
import type { LogEntryChangedEvent } from "../events/events";

@Injectable()
export class AppCacheService {
  private readonly userKeys = new Map<string, Set<string>>();

  constructor(private readonly cacheManager: Cache) { }

  async set(
    key: string,
    value: unknown,
    ttl: number,
    userId: string,
  ): Promise<void> {
    await this.cacheManager.set(key, value, ttl);

    const trackedKeys = this.userKeys.get(userId) ?? new Set<string>();
    trackedKeys.add(key);
    this.userKeys.set(userId, trackedKeys);
  }

  async get<T>(key: string): Promise<T | null> {
    const cachedValue = await this.cacheManager.get<T>(key);
    return cachedValue ?? null;
  }

  async clearForUser(userId: string): Promise<void> {
    const trackedKeys = this.userKeys.get(userId);
    if (!trackedKeys) {
      return;
    }

    for (const key of trackedKeys) {
      await this.cacheManager.del(key);
    }

    this.userKeys.delete(userId);
  }

  @OnEvent(Events.LOG_ENTRY_CHANGED)
  async onLogEntryChanged(event: LogEntryChangedEvent): Promise<void> {
    await this.clearForUser(event.userId);
  }
}
