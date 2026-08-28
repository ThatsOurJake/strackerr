import { join } from "node:path";
import { ValidationPipe } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import hbs from "hbs";

export const configureApp = async (
  app: NestExpressApplication,
): Promise<void> => {
  const viewsPath = join(process.cwd(), "views");
  const pagesPath = join(viewsPath, "pages");

  await new Promise<void>((resolve) => {
    hbs.registerPartials(join(viewsPath, "partials"), resolve);
  });
  hbs.registerHelper("eq", (left: unknown, right: unknown) => left === right);
  hbs.registerHelper("thumbnailUrl", (imageUrl: string) =>
    imageUrl.startsWith("/img/")
      ? imageUrl.replace(/-cover\.webp$/, "-thumb.webp")
      : imageUrl,
  );

  app.use(cookieParser());
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
};
