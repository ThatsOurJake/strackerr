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
  const viewsPath = join(process.cwd(), "views");
  const pagesPath = join(viewsPath, "pages");

  await new Promise<void>((resolve) => {
    hbs.registerPartials(join(viewsPath, "partials"), resolve);
  });
  hbs.registerHelper("eq", (left: unknown, right: unknown) => left === right);
  hbs.registerHelper("initial", (value: string | undefined) =>
    value?.trim().charAt(0).toUpperCase() || "?",
  );
  hbs.registerHelper("localImageUrl", (imageUrl: string | null | undefined) =>
    imageUrl?.startsWith("/img/") ? imageUrl : undefined,
  );
  hbs.registerHelper("thumbnailUrl", (imageUrl: string | null | undefined) =>
    imageUrl?.startsWith("/img/")
      ? imageUrl.replace(/-cover\.webp$/, "-thumb.webp")
      : undefined,
  );

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          scriptSrc: ["'self'", "https://unpkg.com"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: [
            "'self'",
            "data:",
            "https://image.tmdb.org",
            "https://images.igdb.com",
            "https://s4.anilist.co",
            "https://cf.geekdo-images.com",
          ],
          connectSrc: ["'self'", "https://unpkg.com"],
        },
      },
      strictTransportSecurity: process.env.NODE_ENV === "production",
    }),
  );
  app.use(cookieParser());
  app.useBodyParser("urlencoded", { extended: true });
  app.use(csrfProtection);
  app.useStaticAssets(join(process.cwd(), "public"));
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
