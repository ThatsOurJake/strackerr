import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

@Injectable()
export class ApiThrottlerGuard extends ThrottlerGuard {
  protected getTracker(request: Record<string, unknown>): Promise<string> {
    const headers = request.headers as Record<string, string | string[] | undefined>;
    const apiKey = headers["x-api-key"];
    return Promise.resolve(Array.isArray(apiKey) ? apiKey[0] : apiKey ?? "missing-api-key");
  }
}
