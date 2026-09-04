import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ValidationPipe } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import hbs from "hbs";
import helmet from "helmet";
import { csrfProtection } from "./infrastructure/security/csrf.middleware";
import { WebExceptionFilter } from "./infrastructure/security/web-exception.filter";

export const configureApp = async (
  app: NestExpressApplication,
): Promise<void> => {
  const packageJson = JSON.parse(
    readFileSync(join(process.cwd(), "package.json"), "utf-8"),
  ) as { version?: string };
  const assetVersion = process.env.ASSET_VERSION ?? packageJson.version ?? "1";
  const viewsPath = join(process.cwd(), "views");
  const pagesPath = join(viewsPath, "pages");

  await new Promise<void>((resolve) => {
    hbs.registerPartials(join(viewsPath, "partials"), resolve);
  });
  hbs.registerHelper("eq", (left: unknown, right: unknown) => left === right);
  hbs.registerHelper(
    "initial",
    (value: string | undefined) => value?.trim().charAt(0).toUpperCase() || "?",
  );
  hbs.registerHelper("localImageUrl", (imageUrl: string | null | undefined) =>
    imageUrl?.startsWith("/img/") ? imageUrl : undefined,
  );
  hbs.registerHelper("thumbnailUrl", (imageUrl: string | null | undefined) =>
    imageUrl?.startsWith("/img/")
      ? imageUrl.replace(/-cover\.webp$/, "-thumb.webp")
      : undefined,
  );
  hbs.registerHelper("preferredImageUrl", (...values: unknown[]) => {
    const candidates = values.slice(0, -1);
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim().length > 0) {
        return candidate;
      }
    }
    return undefined;
  });
  hbs.registerHelper(
    "assetPath",
    (assetPath: string) => `${assetPath}?v=${assetVersion}`,
  );

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          fontSrc: ["'self'"],
          imgSrc: [
            "'self'",
            "data:",
            "https://image.tmdb.org",
            "https://images.igdb.com",
            "https://s4.anilist.co",
            "https://cf.geekdo-images.com",
            "https://coverartarchive.org",
            "https://archive.org",
            "https://*.archive.org",
          ],
          connectSrc: ["'self'"],
        },
      },
      strictTransportSecurity: process.env.NODE_ENV === "production",
    }),
  );
  app.use(cookieParser());
  app.useBodyParser("urlencoded", { extended: true });
  app.use(csrfProtection);
  app.useStaticAssets(join(process.cwd(), "public"), {
    setHeaders: (res, assetPath) => {
      if (/[/\\]public[/\\](vendor|fonts)[/\\]/.test(assetPath)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    },
  });
  const dataDir = process.env.DATA_DIR ?? "./data";
  app.useStaticAssets(join(dataDir, "images"), { prefix: "/img/" });
  app.setBaseViewsDir([pagesPath, viewsPath]);
  app.setViewEngine("hbs");
  app.set("view options", { layout: "layouts/base" });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new WebExceptionFilter());
};
