import { join } from "node:path";
import { ValidationPipe } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import hbs from "hbs";

export const configureApp = (app: NestExpressApplication): void => {
  const viewsPath = join(process.cwd(), "views");
  const pagesPath = join(viewsPath, "pages");

  hbs.registerPartials(join(viewsPath, "partials"));
  hbs.registerHelper("eq", (left: unknown, right: unknown) => left === right);

  app.use(cookieParser());
  app.useStaticAssets(join(process.cwd(), "public"));
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
