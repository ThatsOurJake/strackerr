import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { configureApp } from "./app.bootstrap";
import { AppModule } from "./app.module";
import { ApiV1Module } from "./modules/api-v1/api-v1.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  await configureApp(app);

  const swaggerConfig = new DocumentBuilder()
    .setTitle("STrackerr API")
    .setDescription("Personal media history tracking API")
    .setVersion("1.0")
    .addApiKey({ type: "apiKey", in: "header", name: "X-API-Key" }, "ApiKey")
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig, {
    include: [ApiV1Module],
  });
  SwaggerModule.setup("api/docs", app, swaggerDocument);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
