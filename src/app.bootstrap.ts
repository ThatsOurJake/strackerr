import { join } from "node:path";
import { ValidationPipe } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import hbs from "hbs";

export const configureApp = (app: NestExpressApplication): void => {
  const viewsPath = join(process.cwd(), "views");

  hbs.registerPartials(join(viewsPath, "partials"));
  hbs.registerPartials(join(viewsPath, "pages"));

  app.useStaticAssets(join(process.cwd(), "public"));
  app.setBaseViewsDir(viewsPath);
  app.setViewEngine("hbs");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
};
