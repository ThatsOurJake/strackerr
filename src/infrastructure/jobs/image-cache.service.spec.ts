import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConfigService } from "@nestjs/config";
import sharp from "sharp";
import { PrismaService } from "../database/prisma.service";
import { ImageCacheService } from "./image-cache.service";

const waitFor = async (condition: () => boolean): Promise<void> => {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (condition()) {
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("Timed out waiting for image cache work");
};

describe("ImageCacheService", () => {
  let dataDir: string;
  let mediaItemUpdate: jest.Mock;
  let cachedImageUpsert: jest.Mock;
  let service: ImageCacheService;

  beforeEach(async () => {
    dataDir = await mkdtemp(join(tmpdir(), "strackerr-images-"));
    mediaItemUpdate = jest.fn().mockResolvedValue({});
    cachedImageUpsert = jest.fn().mockResolvedValue({});
    const prisma = {
      mediaItem: { update: mediaItemUpdate },
      cachedImage: { upsert: cachedImageUpsert },
      $transaction: jest.fn((operations: Promise<unknown>[]) =>
        Promise.all(operations),
      ),
    } as unknown as PrismaService;
    const config = {
      get: jest.fn().mockReturnValue(dataDir),
    } as unknown as ConfigService;
    service = new ImageCacheService(config, prisma);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await rm(dataDir, { recursive: true, force: true });
  });

  it("stores portrait thumb and cover WebP files and updates the media item", async () => {
    const source = await sharp({
      create: {
        width: 20,
        height: 30,
        channels: 3,
        background: "red",
      },
    })
      .png()
      .toBuffer();
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        new Response(source, { headers: { "content-type": "image/png" } }),
      );

    service.enqueue({ mediaItemId: "episode-1", sourceUrl: "https://image" });
    await waitFor(() => mediaItemUpdate.mock.calls.length === 1);

    const thumb = await sharp(
      await readFile(join(dataDir, "images", "episode-1-thumb.webp")),
    ).metadata();
    const cover = await sharp(
      await readFile(join(dataDir, "images", "episode-1-cover.webp")),
    ).metadata();
    expect({ width: thumb.width, height: thumb.height }).toEqual({
      width: 160,
      height: 240,
    });
    expect({ width: cover.width, height: cover.height }).toEqual({
      width: 400,
      height: 600,
    });
    expect(mediaItemUpdate).toHaveBeenCalledWith({
      where: { id: "episode-1" },
      data: { imageUrl: "/img/episode-1-cover.webp" },
    });
    expect(cachedImageUpsert).toHaveBeenCalled();
  });

  it("runs no more than three downloads concurrently and continues after failures", async () => {
    const resolvers: Array<(response: Response) => void> = [];
    const fetchMock = jest.spyOn(global, "fetch").mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolvers.push(resolve);
        }),
    );

    for (let index = 1; index <= 5; index += 1) {
      service.enqueue({
        mediaItemId: `media-${index}`,
        sourceUrl: `https://image/${index}`,
      });
    }

    expect(fetchMock).toHaveBeenCalledTimes(3);
    resolvers.splice(0, 3).forEach((resolve) => {
      resolve(new Response("no image", { status: 404 }));
    });
    await waitFor(() => fetchMock.mock.calls.length === 5);
    resolvers.forEach((resolve) => {
      resolve(new Response("no image", { status: 404 }));
    });
    await waitFor(
      () =>
        (service as unknown as { activeDownloads: number }).activeDownloads ===
        0,
    );
    expect(mediaItemUpdate).not.toHaveBeenCalled();
  });

  it("deletes both image variants when a media item is deleted", async () => {
    const imageDir = join(dataDir, "images");
    const thumbPath = join(imageDir, "media-1-thumb.webp");
    const coverPath = join(imageDir, "media-1-cover.webp");
    await mkdir(imageDir, { recursive: true });
    await Promise.all([
      writeFile(thumbPath, "thumb"),
      writeFile(coverPath, "cover"),
    ]);

    await expect(
      service.handleMediaItemDeleted({ mediaItemId: "media-1" }),
    ).resolves.toBeUndefined();
    await expect(access(thumbPath)).rejects.toThrow();
    await expect(access(coverPath)).rejects.toThrow();
    await expect(service.deleteImages("missing")).resolves.toBeUndefined();
  });
});
